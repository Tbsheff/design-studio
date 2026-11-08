const SHADER_SCRIPT = String.raw`(function () {
  var VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FRAG = [
    "precision mediump float;",
    "uniform vec2 r;uniform float t;uniform float s;uniform float k;uniform float m;uniform float n;uniform vec3 c[5];",
    "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+s)*43758.5453);}",
    "float v(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}",
    "vec3 pal(float x){x=clamp(x,0.,.9999)*(n-1.);vec3 a=c[0];for(int i=0;i<4;i++){if(float(i)<n-1.&&x>=float(i)&&x<float(i+1)){a=mix(c[i],c[i+1],x-float(i));}}return a;}",
    "void main(){",
    "vec2 uv=gl_FragCoord.xy/r;vec2 q=vec2(uv.x*r.x/r.y,uv.y);vec3 col;",
    "if(m<.5){float w=v(q*1.5+vec2(t*.2,s))*.6+v(q*3.+vec2(-t*.15,t*.1))*.4;col=pal(w);}",
    "else if(m<1.5){col=pal(v(q*1.2+t*.1))+(h(gl_FragCoord.xy+floor(t*20.))-.5)*.25;}",
    "else if(m<2.5){float w=sin(q.x*3.+t*.6+s)*.15+v(q*vec2(2.,1.)+t*.2)*.4;float b=smoothstep(0.,.5,.5-abs(uv.y-.45-w));col=mix(c[0]*.15,pal(uv.x+w),b);}",
    "else{float th=mod(floor(gl_FragCoord.x)+2.*floor(gl_FragCoord.y),4.)/4.;col=floor(pal(v(q*1.5+t*.15))*3.+th)/3.;}",
    "gl_FragColor=vec4(col,k);}"
  ].join("");
  var mounted = [];
  var queued = false;

  function toRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function toConfig(el) {
    var style = getComputedStyle(el);
    var preset = style.getPropertyValue("--fx-preset").trim();
    if (!preset) return null;
    var colors = style.getPropertyValue("--fx-colors").trim().split(",").filter(Boolean);
    return {
      colors: colors.length > 1 ? colors : ["#6d5dfc", "#22d3ee"],
      intensity: parseFloat(style.getPropertyValue("--fx-intensity")) || 0.8,
      mode: ["mesh", "grain", "aurora", "dither"].indexOf(preset),
      seed: parseFloat(style.getPropertyValue("--fx-seed")) || 0,
      speed: parseFloat(style.getPropertyValue("--fx-speed")) || 0
    };
  }

  function compile(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  }

  function mount(el, config) {
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.setAttribute("data-fx-canvas", "");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;border-radius:inherit";
    var gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) return null;
    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var at = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.style.isolation = "isolate";
    el.insertBefore(canvas, el.firstChild);
    var entry = { canvas: canvas, config: config, el: el, frame: 0, gl: gl, program: program, start: performance.now() };
    var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function draw(now) {
      var scale = Math.min(window.devicePixelRatio || 1, 1.5);
      var width = Math.max(1, Math.round(el.clientWidth * scale));
      var height = Math.max(1, Math.round(el.clientHeight * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      var cfg = entry.config;
      var list = [];
      for (var i = 0; i < 5; i += 1) list = list.concat(toRgb(cfg.colors[Math.min(i, cfg.colors.length - 1)]));
      gl.viewport(0, 0, width, height);
      gl.uniform2f(gl.getUniformLocation(program, "r"), width, height);
      gl.uniform1f(gl.getUniformLocation(program, "t"), still ? 0 : ((now - entry.start) / 1000) * cfg.speed);
      gl.uniform1f(gl.getUniformLocation(program, "s"), cfg.seed);
      gl.uniform1f(gl.getUniformLocation(program, "k"), cfg.intensity);
      gl.uniform1f(gl.getUniformLocation(program, "m"), cfg.mode);
      gl.uniform1f(gl.getUniformLocation(program, "n"), cfg.colors.length);
      gl.uniform3fv(gl.getUniformLocation(program, "c"), new Float32Array(list));
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!still && cfg.speed > 0) entry.frame = requestAnimationFrame(draw);
    }

    entry.draw = draw;
    entry.frame = requestAnimationFrame(draw);
    return entry;
  }

  function toMatches() {
    var found = [];
    Array.prototype.forEach.call(document.styleSheets, function (sheet) {
      var rules;
      try { rules = sheet.cssRules; } catch (error) { return; }
      Array.prototype.forEach.call(rules, function (rule) {
        if (!rule.style || !rule.style.getPropertyValue("--fx-preset")) return;
        Array.prototype.forEach.call(document.querySelectorAll(rule.selectorText), function (el) {
          if (found.indexOf(el) < 0) found.push(el);
        });
      });
    });
    return found;
  }

  function scan() {
    queued = false;
    var matches = toMatches();
    mounted = mounted.filter(function (entry) {
      if (matches.indexOf(entry.el) >= 0 && entry.canvas.isConnected) return true;
      cancelAnimationFrame(entry.frame);
      entry.canvas.remove();
      return false;
    });
    matches.forEach(function (el) {
      var config = toConfig(el);
      if (!config) return;
      var current = mounted.filter(function (entry) { return entry.el === el; })[0];
      if (current) {
        current.config = config;
        if (config.speed === 0) current.draw(current.start);
        return;
      }
      var entry = mount(el, config);
      if (entry) mounted.push(entry);
    });
  }

  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(scan);
  }

  function boot() {
    scan();
    new MutationObserver(function (records) {
      var own = records.every(function (record) {
        return record.type === "childList" && Array.prototype.every.call(record.addedNodes, function (node) { return node.nodeName === "CANVAS"; }) &&
          Array.prototype.every.call(record.removedNodes, function (node) { return node.nodeName === "CANVAS"; });
      });
      if (!own) queue();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"], childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
`;

const SHADER_RUNTIME_NAME = "shader.js";

export { SHADER_RUNTIME_NAME, SHADER_SCRIPT };
