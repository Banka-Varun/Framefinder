import type {NextConfig} from 'next';
const config:NextConfig={poweredByHeader:false,async redirects(){return [{source:'/films',destination:'/for-you',permanent:false}];}};
export default config;
