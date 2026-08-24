/// <reference types="vite/client" />

declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

declare module 'lucide-react';
declare module 'semver';
declare module 'user-agents';
