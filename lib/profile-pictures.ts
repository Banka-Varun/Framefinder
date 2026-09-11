export const pictureCollections={male:['m1.jpg','m2.jpg','m3.webp','m4.webp','m5.jpg','m6.jpg','m8.jpg','m9.jpg'],female:['f1.jpg','f2.png','f3.png','f5.jpg','f6.png'],anime:["luffy-straw-hat.jpg", "anime-monochrome.jpg", "anime-freedom.jpg", "luffy-peace.jpg", "anime-headphones.jpg", "nobita-shades.jpg", "anime-western.jpg", "shinchan-suit.jpg"],superheroes:["spider-collage.jpg", "robin-blue.jpg", "robin-purple.jpg", "spider-suit.jpg"],cartoons:["cartoon-portrait.jpg", "illustrated-portrait.jpg", "musa.jpg"],telugu:["telugu-cinema-1.jpg", "telugu-cinema-2.jpg", "telugu-cinema-3.jpg", "telugu-cinema-4.jpg", "khaleja.jpg"]} as const;
export type PictureCollection=keyof typeof pictureCollections;
export const picturePath=(file:string)=>'/profile-pictures/'+file;
export function validPicture(value:unknown){return typeof value==='string'&&Object.values(pictureCollections).some(files=>(files as readonly string[]).some(file=>picturePath(file)===value));}
export function visiblePicture(value:string|undefined|null){return value&&!value.startsWith('/api/v1/avatar')?value:'';}

export const collectionLabels:Record<PictureCollection,string>={male:'Male collection',female:'Female collection',anime:'Anime',superheroes:'Superheroes',cartoons:'Cartoons',telugu:'Telugu cinema'};
export type Picture={file:string;label:string;group:PictureCollection;titles:string[];languages:string[];genres:string[]};
export const pictureCatalog:Picture[]=[
 ...pictureCollections.male.map((file,i)=>({file,label:'Original collection · '+(i+1),group:'male' as const,titles:[],languages:[],genres:[]})),
 ...pictureCollections.female.map((file,i)=>({file,label:'Original collection · '+(i+9),group:'female' as const,titles:[],languages:[],genres:[]})),
{"file": "luffy-straw-hat.jpg", "label": "Luffy · Straw hat", "group": "anime", "titles": ["one piece", "luffy"], "languages": ["Japanese"], "genres": ["Animation"]},
{"file": "anime-monochrome.jpg", "label": "Monochrome anime", "group": "anime", "titles": [], "languages": ["Japanese"], "genres": ["Animation"]},
{"file": "anime-freedom.jpg", "label": "Freedom", "group": "anime", "titles": [], "languages": ["Japanese"], "genres": ["Animation"]},
{"file": "luffy-peace.jpg", "label": "Luffy · Peace", "group": "anime", "titles": ["one piece", "luffy"], "languages": ["Japanese"], "genres": ["Animation"]},
{"file": "spider-collage.jpg", "label": "Spider-Man · Collage", "group": "superheroes", "titles": ["spider man", "spiderman"], "languages": ["English"], "genres": ["Action"]},
{"file": "anime-headphones.jpg", "label": "Clouds & headphones", "group": "anime", "titles": [], "languages": ["Japanese"], "genres": ["Animation"]},
{"file": "nobita-shades.jpg", "label": "Nobita", "group": "anime", "titles": ["doraemon", "nobita"], "languages": ["Japanese"], "genres": ["Animation"]},
{"file": "robin-blue.jpg", "label": "Robin · Blue", "group": "superheroes", "titles": ["teen titans", "batman", "robin"], "languages": ["English"], "genres": ["Action"]},
{"file": "robin-purple.jpg", "label": "Robin · Purple", "group": "superheroes", "titles": ["teen titans", "batman", "robin"], "languages": ["English"], "genres": ["Action"]},
{"file": "anime-western.jpg", "label": "Western anime", "group": "anime", "titles": [], "languages": ["Japanese"], "genres": ["Animation"]},
{"file": "shinchan-suit.jpg", "label": "Shinchan · Suit", "group": "anime", "titles": ["shinchan", "shin chan"], "languages": ["Japanese"], "genres": ["Animation"]},
{"file": "spider-suit.jpg", "label": "Spider-Man · Suit", "group": "superheroes", "titles": ["spider man", "spiderman"], "languages": ["English"], "genres": ["Action"]},
{"file": "cartoon-portrait.jpg", "label": "Cartoon portrait", "group": "cartoons", "titles": [], "languages": ["English"], "genres": ["Animation"]},
{"file": "illustrated-portrait.jpg", "label": "Illustrated portrait", "group": "cartoons", "titles": [], "languages": ["English"], "genres": ["Animation"]},
{"file": "musa.jpg", "label": "Musa", "group": "cartoons", "titles": ["winx"], "languages": ["English"], "genres": ["Animation"]},
{"file": "telugu-cinema-1.jpg", "label": "Telugu cinema · 1", "group": "telugu", "titles": [], "languages": ["Telugu"], "genres": ["Action"]},
{"file": "telugu-cinema-2.jpg", "label": "Telugu cinema · 2", "group": "telugu", "titles": [], "languages": ["Telugu"], "genres": ["Action"]},
{"file": "telugu-cinema-3.jpg", "label": "Telugu cinema · 3", "group": "telugu", "titles": [], "languages": ["Telugu"], "genres": ["Action"]},
{"file": "telugu-cinema-4.jpg", "label": "Telugu cinema · 4", "group": "telugu", "titles": [], "languages": ["Telugu"], "genres": ["Action"]},
{"file": "khaleja.jpg", "label": "Khaleja", "group": "telugu", "titles": ["khaleja"], "languages": ["Telugu"], "genres": ["Action"]}
];
const normalized=(value:string)=>value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function suggestPictures(languages:string[],favorites:{title:string;genres:string[]}[]){
 return pictureCatalog.map(picture=>{
  const movie=favorites.find(f=>picture.titles.some(title=>normalized(f.title).includes(normalized(title))));
  const language=picture.languages.find(language=>languages.includes(language));
  const genre=picture.genres.find(genre=>favorites.some(f=>f.genres.includes(genre)));
  return {...picture,score:(movie?100:0)+(language?20:0)+(genre?5:0),reason:movie?'Because you like '+movie.title:language?'For your '+language+' interest':genre?'Inspired by your '+genre.toLowerCase()+' favorites':''};
 }).filter(p=>p.score>0).sort((a,b)=>b.score-a.score||a.file.localeCompare(b.file)).slice(0,12);
}
