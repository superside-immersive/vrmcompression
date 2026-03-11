import { BASIS_TRANSCODER_PATH, DRACO_DECODER_PATH } from '../constants/assets.js';

export async function loadVrmLoaderDeps() {
  const [
    { GLTFLoader },
    { DRACOLoader },
    { KTX2Loader },
    { MeshoptDecoder },
    { VRMLoaderPlugin, VRMUtils },
  ] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/loaders/DRACOLoader.js'),
    import('three/examples/jsm/loaders/KTX2Loader.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
    import('@pixiv/three-vrm'),
  ]);

  return {
    GLTFLoader,
    DRACOLoader,
    KTX2Loader,
    MeshoptDecoder,
    VRMLoaderPlugin,
    VRMUtils,
  };
}

export async function loadGltfLoaderDeps() {
  const [
    { GLTFLoader },
    { DRACOLoader },
    { KTX2Loader },
    { MeshoptDecoder },
  ] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/loaders/DRACOLoader.js'),
    import('three/examples/jsm/loaders/KTX2Loader.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
  ]);

  return {
    GLTFLoader,
    DRACOLoader,
    KTX2Loader,
    MeshoptDecoder,
  };
}

export async function loadFbxLoaderDeps() {
  const [{ FBXLoader }] = await Promise.all([
    import('three/examples/jsm/loaders/FBXLoader.js'),
  ]);

  return { FBXLoader };
}

export function createConfiguredGltfLoader({ GLTFLoader, DRACOLoader, MeshoptDecoder, KTX2Loader, gl, useKtx2 = false }) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
  loader.setDRACOLoader(dracoLoader);

  let ktx2Loader = null;
  if (useKtx2 && KTX2Loader && gl) {
    ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath(BASIS_TRANSCODER_PATH);
    ktx2Loader.detectSupport(gl);
    loader.setKTX2Loader(ktx2Loader);
  }

  return {
    loader,
    dracoLoader,
    ktx2Loader,
  };
}
