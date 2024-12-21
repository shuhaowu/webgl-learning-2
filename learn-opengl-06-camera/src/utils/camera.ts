import { type ReadonlyMat4, type ReadonlyVec3, mat4, vec3 } from "gl-matrix";

// TODO: maybe merge this with the camera control?

export class Camera {
  readonly position: vec3;
  readonly front: vec3;
  readonly up: vec3;
  readonly right: vec3 = vec3.create();

  fov: number;

  #worldUp: vec3 = vec3.create();
  // To avoid an allocation every cycle, we save these temporary variables here.
  #mat: mat4 = mat4.create();
  #target: vec3 = vec3.create();

  constructor(position: vec3, front: vec3, up: vec3, fov: number) {
    this.position = position;
    this.front = front;
    this.up = up;
    this.fov = fov;

    vec3.copy(this.#worldUp, this.up);
    vec3.cross(this.right, this.front, this.#worldUp);
    vec3.normalize(this.right, this.right);
  }

  moveForward(distance: number): void {
    vec3.scaleAndAdd(this.position, this.position, this.front, distance);
  }

  moveRight(distance: number): void {
    vec3.scaleAndAdd(this.position, this.position, this.right, distance);
  }

  moveUp(distance: number): void {
    vec3.scaleAndAdd(this.position, this.position, this.up, distance);
  }

  setFront(front: ReadonlyVec3): void {
    vec3.copy(this.front, front);
    this.#updateDirectionalVectors();
  }

  cameraMatrix(): ReadonlyMat4 {
    // Target is always position + front
    vec3.add(this.#target, this.position, this.front);
    mat4.lookAt(this.#mat, this.position, this.#target, this.up);
    return this.#mat;
  }

  #updateDirectionalVectors(): void {
    vec3.cross(this.right, this.front, this.#worldUp);
    vec3.normalize(this.right, this.right);

    vec3.cross(this.up, this.right, this.front);
    vec3.normalize(this.up, this.up);
  }
}

export class CameraControllerFPS {
  #canvas: HTMLCanvasElement;
  #camera: Camera;
  #linearSpeed: number;
  #mouseSensitivity: number;
  #zoomSensitivity: number;

  #currentForwardSpeed: number = 0.0;
  #currentRightSpeed: number = 0.0;

  #mouseControlEnabled: boolean = false;
  #pitch = 0.0;
  #yaw = -90.0; // Default is looking into -z
  #cameraFront: vec3 = vec3.create(); // Technically duplicates #camera.front, but that one is readonly..

  #lastMousePos?: { x: number; y: number };

  // Linear speed is unit/ms
  constructor(
    canvas: HTMLCanvasElement,
    camera: Camera,
    linearSpeed: number,
    mouseSensitivity: number,
    zoomSensitivity: number = 0.01,
  ) {
    this.#canvas = canvas;
    this.#camera = camera;
    this.#linearSpeed = linearSpeed;
    this.#mouseSensitivity = mouseSensitivity;
    this.#zoomSensitivity = zoomSensitivity;
  }

  start(): void {
    window.addEventListener("keydown", this.#onKeyDown); // TODO: capture the entire window might not be ideal, but good enough for now.
    window.addEventListener("keyup", this.#onKeyUp);
    window.addEventListener("blur", this.#onBlurAndFocus);
    window.addEventListener("focus", this.#onBlurAndFocus);

    this.#canvas.addEventListener("mousemove", this.#onMouseMove);
    this.#canvas.addEventListener("mousedown", this.#onMouseDown);
    this.#canvas.addEventListener("mouseup", this.#onMouseUp);
    this.#canvas.addEventListener("mouseleave", this.#onMouseUp);

    this.#canvas.addEventListener("wheel", this.#onWheel);
  }

  stop(): void {
    window.removeEventListener("keydown", this.#onKeyDown);
    window.removeEventListener("keyup", this.#onKeyUp);
    window.removeEventListener("blur", this.#onBlurAndFocus);
    window.removeEventListener("focus", this.#onBlurAndFocus);

    this.#canvas.removeEventListener("mousemove", this.#onMouseMove);
    this.#canvas.removeEventListener("mousedown", this.#onMouseDown);
    this.#canvas.removeEventListener("mouseup", this.#onMouseUp);
    this.#canvas.removeEventListener("mouseleave", this.#onMouseUp);
  }

  update(dt: number): void {
    if (this.#currentForwardSpeed !== 0.0) {
      this.#camera.moveForward(this.#currentForwardSpeed * dt);
    }

    if (this.#currentRightSpeed !== 0.0) {
      this.#camera.moveRight(this.#currentRightSpeed * dt);
    }
  }

  #onKeyDown = (ev: KeyboardEvent) => {
    switch (ev.code) {
      case "KeyW":
        this.#currentForwardSpeed = this.#linearSpeed;
        break;

      case "KeyA":
        this.#currentRightSpeed = -this.#linearSpeed;
        break;

      case "KeyS":
        this.#currentForwardSpeed = -this.#linearSpeed;
        break;

      case "KeyD":
        this.#currentRightSpeed = this.#linearSpeed;
        break;
    }
  };

  #onKeyUp = (ev: KeyboardEvent) => {
    switch (ev.code) {
      case "KeyW":
        if (this.#currentForwardSpeed === this.#linearSpeed) {
          this.#currentForwardSpeed = 0.0;
        }
        break;

      case "KeyA":
        if (this.#currentRightSpeed === -this.#linearSpeed) {
          this.#currentRightSpeed = 0.0;
        }
        break;

      case "KeyS":
        if (this.#currentForwardSpeed === -this.#linearSpeed) {
          this.#currentForwardSpeed = 0.0;
        }
        break;

      case "KeyD":
        if (this.#currentRightSpeed === this.#linearSpeed) {
          this.#currentRightSpeed = 0.0;
        }
        break;
    }
  };

  #onBlurAndFocus = () => {
    this.#currentForwardSpeed = 0.0;
    this.#currentRightSpeed = 0.0;

    this.#mouseControlEnabled = false;
    this.#lastMousePos = undefined;
  };

  #onMouseMove = (ev: MouseEvent) => {
    if (!this.#mouseControlEnabled) {
      return;
    }

    if (this.#lastMousePos == null) {
      this.#lastMousePos = {
        x: ev.offsetX,
        y: ev.offsetY,
      };

      return;
    }

    const dx = ev.offsetX - this.#lastMousePos.x;
    const dy = this.#lastMousePos.y - ev.offsetY; // Y is flipped for mouse event

    this.#yaw += dx * this.#mouseSensitivity;
    this.#pitch += dy * this.#mouseSensitivity;

    if (this.#pitch > 89) {
      this.#pitch = 89;
    } else if (this.#pitch < -89) {
      this.#pitch = -89;
    }

    const yaw = (this.#yaw * Math.PI) / 180;
    const pitch = (this.#pitch * Math.PI) / 180;

    this.#cameraFront[0] = Math.cos(yaw) * Math.cos(pitch);
    this.#cameraFront[1] = Math.sin(pitch);
    this.#cameraFront[2] = Math.sin(yaw) * Math.cos(pitch);
    vec3.normalize(this.#cameraFront, this.#cameraFront);
    this.#camera.setFront(this.#cameraFront);

    this.#lastMousePos.x = ev.offsetX;
    this.#lastMousePos.y = ev.offsetY;
  };

  #onMouseDown = () => {
    this.#mouseControlEnabled = true;
    this.#lastMousePos = undefined;
  };

  #onMouseUp = () => {
    this.#mouseControlEnabled = false;
    this.#lastMousePos = undefined;
  };

  #onWheel = (ev: WheelEvent) => {
    // TODO: deal with ev.deltaMode

    this.#camera.fov += ev.deltaY * this.#zoomSensitivity;
    if (this.#camera.fov > 60) {
      this.#camera.fov = 60;
    }

    if (this.#camera.fov < 5) {
      this.#camera.fov = 5;
    }

    console.log(this.#camera.fov);
  };
}
