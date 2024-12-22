export class STLParseError extends Error {}

type MinMaxDelta = {
  min: number;
  max: number;
  delta: number;
};

type STLExtent = {
  x: MinMaxDelta;
  y: MinMaxDelta;
  z: MinMaxDelta;
};

export class STL {
  static async loadFromUrl(url: string): Promise<STL> {
    const response = await fetch(url);
    const data = await response.arrayBuffer();

    return STL.parse(data);
  }

  static parse(data: ArrayBuffer): STL {
    if (data.byteLength < 84) {
      throw new STLParseError(`data has ${data.byteLength} bytes which is less than the required 84 bytes`);
    }

    let i = 80;
    const view = new DataView(data);

    // Take a copy of the header
    const header = data.slice(0, i);

    // Check make sure we don't have a ASCII STL file
    const decoder = new TextDecoder();
    const maybeHeaderStr = decoder.decode(header);
    if (maybeHeaderStr.indexOf("solid") !== -1) {
      throw new STLParseError("plain text STL file is not supported!");
    }

    // Read the triangle count
    const triangleCount = view.getUint32(i, true);
    i += 4;

    // Validate the file size
    const expectedByteLength = 84 + triangleCount * 50;
    if (data.byteLength !== expectedByteLength) {
      throw new STLParseError(
        `expected STL file to be ${expectedByteLength} bytes with ${triangleCount} triangles, but got ${data.byteLength} instead`,
      );
    }

    // Allocate the arrays
    let vertices: Float32Array;

    const attributeBytes = new Uint16Array(triangleCount);

    vertices = new Float32Array(2 * 9 * triangleCount);

    for (let j = 0; j < triangleCount; j++) {
      const normalX = view.getFloat32(i, true);
      i += 4;
      const normalY = view.getFloat32(i, true);
      i += 4;
      const normalZ = view.getFloat32(i, true);
      i += 4;

      // Read vertices, but in xyzabc format, where xyz are the position and abc are the normal xyzs.
      vertices[j * 18 + 0] = view.getFloat32(i, true);
      i += 4;
      vertices[j * 18 + 1] = view.getFloat32(i, true);
      i += 4;
      vertices[j * 18 + 2] = view.getFloat32(i, true);
      i += 4;
      vertices[j * 18 + 3] = normalX;
      vertices[j * 18 + 4] = normalY;
      vertices[j * 18 + 5] = normalZ;

      vertices[j * 18 + 6] = view.getFloat32(i, true);
      i += 4;
      vertices[j * 18 + 7] = view.getFloat32(i, true);
      i += 4;
      vertices[j * 18 + 8] = view.getFloat32(i, true);
      i += 4;
      vertices[j * 18 + 9] = normalX;
      vertices[j * 18 + 10] = normalY;
      vertices[j * 18 + 11] = normalZ;

      vertices[j * 18 + 12] = view.getFloat32(i, true);
      i += 4;
      vertices[j * 18 + 13] = view.getFloat32(i, true);
      i += 4;
      vertices[j * 18 + 14] = view.getFloat32(i, true);
      i += 4;
      vertices[j * 18 + 15] = normalX;
      vertices[j * 18 + 16] = normalY;
      vertices[j * 18 + 17] = normalZ;

      // Read the attribute byte
      attributeBytes[j] = view.getUint16(i, true);
      i += 2;
    }

    return new STL(header, triangleCount, vertices, attributeBytes);
  }

  readonly header: ArrayBuffer;

  readonly triangleCount: number;

  // These are just all the vertices in xyzabc xyzabc xyzabc order.
  // xyz are the vertex coordinates while abc are the normal.
  // Each group of 3 vertices forms a single triangle.
  // The whole array should b
  readonly vertices: Float32Array;

  readonly attributeBytes: Uint16Array;

  readonly extent: Readonly<STLExtent>;

  private constructor(header: ArrayBuffer, triangleCount: number, vertices: Float32Array, attributeBytes: Uint16Array) {
    this.header = header;
    this.triangleCount = triangleCount;
    this.vertices = vertices;
    this.attributeBytes = attributeBytes;

    const extent: STLExtent = {
      x: {
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
        delta: 0,
      },
      y: {
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
        delta: 0,
      },
      z: {
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
        delta: 0,
      },
    };

    for (let i = 0; i < this.triangleCount * 3; i++) {
      const x = this.vertices[i * 6 + 0];
      const y = this.vertices[i * 6 + 1];
      const z = this.vertices[i * 6 + 2];

      if (x < extent.x.min) {
        extent.x.min = x;
      }

      if (x > extent.x.max) {
        extent.x.max = x;
      }

      if (y < extent.y.min) {
        extent.y.min = y;
      }

      if (y > extent.y.max) {
        extent.y.max = y;
      }

      if (z < extent.z.min) {
        extent.z.min = z;
      }

      if (z > extent.z.max) {
        extent.z.max = z;
      }
    }

    extent.x.delta = extent.x.max - extent.x.min;
    extent.y.delta = extent.y.max - extent.y.min;
    extent.z.delta = extent.z.max - extent.z.min;
    this.extent = Object.freeze(extent);
  }
}
