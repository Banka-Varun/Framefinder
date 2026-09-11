export const pictureCollections={male:['m1.jpg','m2.jpg','m3.webp','m4.webp','m5.jpg','m6.jpg','m8.jpg','m9.jpg'],female:['f1.jpg','f2.png','f3.png','f5.jpg','f6.png']} as const;
export type PictureCollection=keyof typeof pictureCollections;
export const picturePath=(file:string)=>'/profile-pictures/'+file;
export function validPicture(value:unknown){return typeof value==='string'&&Object.values(pictureCollections).some(files=>(files as readonly string[]).some(file=>picturePath(file)===value));}
export function visiblePicture(value:string|undefined|null){return value&&!value.startsWith('/api/v1/avatar')?value:'';}
