/** Wait without blocking rendering, and let an unmounted canvas cancel its pending work. */
function nextFrame(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => { cancelAnimationFrame(id); reject(signal.reason); };
    const id = requestAnimationFrame(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    });
    signal.addEventListener('abort', abort, { once: true });
  });
}

/** Link both shaders before checking status; poll in the background when the driver supports it. */
export async function compileProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string, signal: AbortSignal) {
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null;
  let complete = false;
  try {
    signal.throwIfAborted();
    const parallel = gl.getExtension('KHR_parallel_shader_compile');
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Could not create tunnel shader');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
    }
    program = gl.createProgram();
    if (!program) throw new Error('Could not create tunnel program');
    shaders.forEach((shader) => gl.attachShader(program!, shader));
    gl.linkProgram(program);

    // COMPILE_STATUS and LINK_STATUS can stall for seconds if queried before the driver finishes.
    // Without the extension, still allow the page to paint before the unavoidable status check.
    await nextFrame(signal);
    if (parallel) {
      while (!gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) await nextFrame(signal);
    } else {
      await nextFrame(signal);
    }
    signal.throwIfAborted();
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || shaders.map((s) => gl.getShaderInfoLog(s)).filter(Boolean).join('\n') || 'Tunnel shader link failed');
    }
    complete = true;
    return program;
  } finally {
    shaders.forEach((shader) => gl.deleteShader(shader));
    if (program && !complete) gl.deleteProgram(program);
  }
}

