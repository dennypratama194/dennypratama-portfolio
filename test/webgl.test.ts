import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { compileProgram } from '@/lib/webgl';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => setTimeout(callback, 16));
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function driver(parallel = true) {
  const program = {} as WebGLProgram;
  const gl = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, LINK_STATUS: 3,
    getExtension: vi.fn(() => parallel ? { COMPLETION_STATUS_KHR: 4 } : null),
    createShader: vi.fn(() => ({} as WebGLShader)),
    shaderSource: vi.fn(), compileShader: vi.fn(), attachShader: vi.fn(), linkProgram: vi.fn(),
    createProgram: vi.fn(() => program),
    getProgramParameter: vi.fn((_program: WebGLProgram, _status: number) => true),
    getShaderInfoLog: vi.fn(() => ''), getProgramInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(), deleteProgram: vi.fn(),
  };
  return { gl, program, context: gl as unknown as WebGL2RenderingContext };
}

it('polls completion across frames before reading link status, then frees both shaders', async () => {
  const { gl, context, program } = driver();
  let finished = false;
  gl.getProgramParameter.mockImplementation((_p?: unknown, status?: number) => status === 4 ? finished : true);
  const result = compileProgram(context, 'vertex', 'fragment', new AbortController().signal);
  expect(gl.compileShader).toHaveBeenCalledTimes(2);
  expect(gl.linkProgram).toHaveBeenCalledWith(program);
  expect(gl.getProgramParameter).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(48);
  expect(gl.getProgramParameter.mock.calls.every((call) => call[1] === 4)).toBe(true);
  expect(gl.deleteShader).not.toHaveBeenCalled();
  finished = true;
  await vi.advanceTimersByTimeAsync(16);
  await expect(result).resolves.toBe(program);
  expect(gl.getProgramParameter).toHaveBeenLastCalledWith(program, gl.LINK_STATUS);
  expect(gl.deleteShader).toHaveBeenCalledTimes(2);
  expect(gl.deleteProgram).not.toHaveBeenCalled();
});

it('allows a paint before checking link status on browsers without parallel compilation', async () => {
  const { gl, context, program } = driver(false);
  const result = compileProgram(context, 'vertex', 'fragment', new AbortController().signal);
  await vi.advanceTimersByTimeAsync(16);
  expect(gl.getProgramParameter).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(16);
  await expect(result).resolves.toBe(program);
  expect(gl.getProgramParameter).toHaveBeenCalledExactlyOnceWith(program, gl.LINK_STATUS);
});

it('cancels an unmounted canvas without leaving a polling frame or GL resources behind', async () => {
  const { gl, context, program } = driver();
  gl.getProgramParameter.mockReturnValue(false);
  const controller = new AbortController();
  const result = compileProgram(context, 'vertex', 'fragment', controller.signal);
  const rejected = expect(result).rejects.toMatchObject({ name: 'AbortError' });
  await vi.advanceTimersByTimeAsync(32);
  controller.abort();
  await rejected;
  expect(vi.getTimerCount()).toBe(0);
  expect(gl.deleteShader).toHaveBeenCalledTimes(2);
  expect(gl.deleteProgram).toHaveBeenCalledWith(program);
});

it('reports a failed link and releases the failed program so the still-image fallback can take over', async () => {
  const { gl, context, program } = driver();
  gl.getProgramParameter.mockImplementation((_p?: unknown, status?: number) => status === 4);
  gl.getProgramInfoLog.mockReturnValue('driver link failure');
  const result = compileProgram(context, 'vertex', 'fragment', new AbortController().signal);
  const rejected = expect(result).rejects.toThrow('driver link failure');
  await vi.advanceTimersByTimeAsync(16);
  await rejected;
  expect(gl.deleteShader).toHaveBeenCalledTimes(2);
  expect(gl.deleteProgram).toHaveBeenCalledWith(program);
});

it('does not allocate anything when navigation has already cancelled setup', async () => {
  const { gl, context } = driver();
  const controller = new AbortController();
  controller.abort();
  await expect(compileProgram(context, 'vertex', 'fragment', controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  expect(gl.createShader).not.toHaveBeenCalled();
  expect(gl.createProgram).not.toHaveBeenCalled();
});

