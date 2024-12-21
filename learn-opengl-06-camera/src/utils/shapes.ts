export type VerticesAndIndices = {
  vertices: Float32Array;
  indices: Uint16Array;
};

export function quadWithUv(width: number = 1.0, height: number = 1.0): VerticesAndIndices {
  const w = width / 2;
  const h = height / 2;

  // biome-ignore format:
  return {
    vertices: new Float32Array([
       w,  h, 0, 1.0, 1.0, // top right
       w, -h, 0, 1.0, 0.0, // bottom right
      -w, -h, 0, 0.0, 0.0, // bottom left
      -w,  h, 0, 0.0, 1.0, // top left
    ]),
    indices: new Uint16Array([
      0, 1, 3,
      1, 2, 3,
    ])
  }
}

export function cubeWithUv(width: number = 1.0, height: number = 1.0, depth: number = 1.0): VerticesAndIndices {
  const w = width / 2;
  const h = height / 2;
  const d = depth / 2;

  // biome-ignore format:
  return {
    vertices: new Float32Array([
      // front face
       w,  h, d, 1.0, 1.0, // top right
       w, -h, d, 1.0, 0.0, // bottom right
      -w, -h, d, 0.0, 0.0, // bottom left
      -w,  h, d, 0.0, 1.0, // top left

      // back face
       w,  h, -d, 1.0, 1.0, // top right
       w, -h, -d, 1.0, 0.0, // bottom right
      -w, -h, -d, 0.0, 0.0, // bottom left
      -w,  h, -d, 0.0, 1.0, // top left

      // top face
      -w, h, -d, 1.0, 1.0, // top right
      -w, h,  d, 1.0, 0.0, // bottom right
       w, h,  d, 0.0, 0.0, // bottom left
       w, h, -d, 0.0, 1.0, // top left

       // bottom face
      -w, -h, -d, 1.0, 1.0, // top right
      -w, -h,  d, 1.0, 0.0, // bottom right
       w, -h,  d, 0.0, 0.0, // bottom left
       w, -h, -d, 0.0, 1.0, // top left

       // left face
       -w, -h, -d, 1.0, 1.0, // top right
       -w, -h,  d, 1.0, 0.0, // bottom right
       -w,  h,  d, 0.0, 0.0, // bottom left
       -w,  h, -d, 0.0, 1.0, // top left

       // right face
       w,  h, -d, 1.0, 1.0, // top right
       w,  h,  d, 1.0, 0.0, // bottom right
       w, -h,  d, 0.0, 0.0, // bottom left
       w, -h, -d, 0.0, 1.0, // top left
    ]),
    indices: new Uint16Array([
      0, 1, 3,
      1, 2, 3,

      4, 5, 7,
      5, 6, 7,

      8, 9, 11,
      9, 10, 11,

      12, 13, 15,
      13, 14, 15,

      16, 17, 19,
      17, 18, 19,

      20, 21, 23,
      21, 22, 23,
    ])
  }
}
