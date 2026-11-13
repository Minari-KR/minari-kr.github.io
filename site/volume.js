// Default master volume for the Unity games (loaded in each game page's <head>, before Unity starts).
// Unity's web audio sends every sound, streamed music included, to audioContext.destination, so a gain
// node placed in front of the destination turns the whole game down. The game's own volume settings still apply.
(() => {
  const VOLUME = 0.4; // under 50% by request
  const connect = AudioNode.prototype.connect;
  const masters = new WeakMap();
  AudioNode.prototype.connect = function (target, ...rest) {
    if (target instanceof AudioDestinationNode && this !== masters.get(target)) {
      let master = masters.get(target);
      if (!master) {
        master = target.context.createGain();
        master.gain.value = VOLUME;
        masters.set(target, master);
        connect.call(master, target);
      }
      return connect.call(this, master, ...rest);
    }
    return connect.call(this, target, ...rest);
  };
})();
