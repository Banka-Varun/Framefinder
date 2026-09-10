import SocialApp from '../social-app';
export default async function Page({params}:{params:Promise<{path:string[]}>}){const{path}=await params;return <SocialApp path={path}/>}
