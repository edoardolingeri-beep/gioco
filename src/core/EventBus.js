/**
 * EventBus.js — Bus di eventi minimale.
 * Permette ai sistemi di comunicare senza dipendenze incrociate:
 * es. `bus.emit('resource:gained', {type:'wood', n:1})` → HUD, audio, particelle.
 */

export class EventBus {
  constructor() { this.map = new Map(); }

  on(evt, fn) {
    let list = this.map.get(evt);
    if (!list) this.map.set(evt, (list = []));
    list.push(fn);
    return () => this.off(evt, fn);
  }

  once(evt, fn) {
    const off = this.on(evt, (d) => { off(); fn(d); });
    return off;
  }

  off(evt, fn) {
    const list = this.map.get(evt);
    if (!list) return;
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  }

  emit(evt, data) {
    const list = this.map.get(evt);
    if (!list) return;
    // copia difensiva solo se necessario (evita allocazioni nel caso comune)
    for (let i = 0; i < list.length; i++) list[i](data);
  }
}
