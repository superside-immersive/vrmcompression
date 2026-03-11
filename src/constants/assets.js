export const DEFAULT_AVATAR_FILE_NAME = 'SNOO (2).vrm';
export const DEFAULT_ANIMATION_FILE_NAME = 'Step Hip Hop Dance.fbx';

export function withBasePath(path) {
  const normalizedBase = import.meta.env.BASE_URL || '/';
  const normalizedPath = path.replace(/^\//, '');
  return `${normalizedBase}${normalizedPath}`;
}

export const DEFAULT_AVATAR_URLS = [withBasePath(encodeURIComponent(DEFAULT_AVATAR_FILE_NAME))];
export const DEFAULT_ANIMATION_URLS = [withBasePath(encodeURIComponent(DEFAULT_ANIMATION_FILE_NAME))];
export const DRACO_DECODER_PATH = withBasePath('vendor/draco/');
export const BASIS_TRANSCODER_PATH = withBasePath('vendor/basis/');

export const AVAILABLE_ANIMATIONS = [
  { name: 'Chicken', file: 'Chicken Dance.fbx' },
  { name: 'Locking', file: 'Locking Hip Hop Dance.fbx' },
  { name: 'Macarena', file: 'Macarena Dance.fbx' },
  { name: 'Slide', file: 'Slide Hip Hop Dance.fbx' },
  { name: 'Step', file: 'Step Hip Hop Dance.fbx' },
  { name: 'Twist', file: 'Twist Dance.fbx' },
];

export const COMPATIBLE_ANIMATION_EXTENSIONS = '.fbx,.glb,.gltf';
