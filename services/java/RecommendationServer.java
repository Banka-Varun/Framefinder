import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.concurrent.*;

/** Java 17 HTTP boundary for the Python recommendation engine.
 * Binds only to loopback. Put authenticated TLS ingress in front for remote use.
 * Run from repository root: java services/java/RecommendationServer.java
 */
public class RecommendationServer {
    static final int MAX_BODY = 65536;
    static final Semaphore CAPACITY = new Semaphore(4);
    static final Path ENGINE = Path.of("services/python/recommender.py").toAbsolutePath();
    static final String TOKEN = System.getenv("FRAMEFINDER_API_TOKEN");
    static final String PYTHON = System.getenv().getOrDefault("FRAMEFINDER_PYTHON", "python3");
    static final ExecutorService READERS = Executors.newCachedThreadPool();

    static void respond(HttpExchange ex, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.getResponseHeaders().set("Cache-Control", "no-store");
        ex.sendResponseHeaders(status, bytes.length);
        try (OutputStream out = ex.getResponseBody()) { out.write(bytes); }
    }
    static boolean authorized(HttpExchange ex) {
        if (TOKEN == null || TOKEN.isBlank()) return true; // Loopback development only.
        String header = ex.getRequestHeaders().getFirst("Authorization");
        return header != null && MessageDigest.isEqual(("Bearer " + TOKEN).getBytes(StandardCharsets.UTF_8), header.getBytes(StandardCharsets.UTF_8));
    }
    static void handle(HttpExchange ex) throws IOException {
        if (!ex.getRequestURI().getPath().equals("/api/recommendations")) { respond(ex,404,"{\"error\":\"Not found\"}"); return; }
        if (!ex.getRequestMethod().equals("POST")) { ex.getResponseHeaders().set("Allow","POST"); respond(ex,405,"{\"error\":\"POST required\"}"); return; }
        if (!authorized(ex)) { respond(ex,401,"{\"error\":\"Unauthorized\"}"); return; }
        byte[] input = ex.getRequestBody().readNBytes(MAX_BODY+1);
        if (input.length > MAX_BODY) { respond(ex,413,"{\"error\":\"Request too large\"}"); return; }
        if (!CAPACITY.tryAcquire()) { respond(ex,429,"{\"error\":\"Busy; retry shortly\"}"); return; }
        Process process = null;
        Future<byte[]> output = null;
        try {
            process = new ProcessBuilder(PYTHON, ENGINE.toString()).redirectError(ProcessBuilder.Redirect.DISCARD).start();
            Process active = process;
            output = READERS.submit(() -> active.getInputStream().readNBytes(2_000_000));
            try (OutputStream stdin = process.getOutputStream()) { stdin.write(input); }
            if (!process.waitFor(8, TimeUnit.SECONDS)) { process.destroyForcibly(); respond(ex,504,"{\"error\":\"Recommendation timeout\"}"); return; }
            String result = new String(output.get(2,TimeUnit.SECONDS),StandardCharsets.UTF_8);
            if (result.isBlank()) { respond(ex,502,"{\"error\":\"Recommendation engine unavailable\"}"); return; }
            respond(ex,process.exitValue()==0?200:400,result);
        } catch (InterruptedException err) {
            Thread.currentThread().interrupt();
            respond(ex,503,"{\"error\":\"Service interrupted\"}");
        } catch (Exception err) {
            respond(ex,502,"{\"error\":\"Recommendation engine unavailable\"}");
        } finally {
            if (process != null && process.isAlive()) process.destroyForcibly();
            if (output != null && !output.isDone()) output.cancel(true);
            CAPACITY.release();
        }
    }
    public static void main(String[] args) throws Exception {
        if (!Files.isRegularFile(ENGINE)) throw new IllegalStateException("Run from the Framefinder repository root.");
        int port = Integer.parseInt(System.getenv().getOrDefault("FRAMEFINDER_PORT","8081"));
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1",port),16);
        server.createContext("/api/recommendations", RecommendationServer::handle);
        server.createContext("/health", ex -> respond(ex,200,"{\"status\":\"ok\",\"service\":\"java-python-recommendations\"}"));
        server.setExecutor(Executors.newFixedThreadPool(8));
        Runtime.getRuntime().addShutdownHook(new Thread(() -> { server.stop(1); READERS.shutdownNow(); }));
        server.start();
        System.out.println("Framefinder Java API listening on 127.0.0.1:" + port);
    }
}
