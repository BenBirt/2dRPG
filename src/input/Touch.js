// Touch source: virtual joystick on left half + action buttons on right.
// Mirrors Keyboard.js pattern — registered via input.addSource(touchInstance).

export class Touch {
  constructor(input) {
    this.input = input;
    this.moveX = 0;
    this.moveY = 0;
    this.enabled = false;

    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const forced = new URLSearchParams(location.search).has('touch');
    if (!coarse && !forced) return;

    this.enabled = true;

    const touchEl = document.getElementById('touch');
    touchEl.classList.remove('hidden');
    touchEl.style.touchAction = 'none';

    const joystick = document.getElementById('joystick');
    const knob = document.getElementById('joystick-knob');

    // Joystick state
    let stickPointerId = null;
    let originX = 0;
    let originY = 0;
    const RADIUS = 60; // half of the 120px joystick

    const showJoystick = (cx, cy) => {
      joystick.style.left = (cx - RADIUS) + 'px';
      joystick.style.top = (cy - RADIUS) + 'px';
      joystick.style.display = 'block';
    };

    const hideJoystick = () => {
      joystick.style.display = 'none';
      knob.style.transform = 'translate(-50%, -50%)';
      this.moveX = 0;
      this.moveY = 0;
      stickPointerId = null;
    };

    const updateKnob = (dx, dy) => {
      const mag = Math.hypot(dx, dy);
      let cx = dx;
      let cy = dy;
      if (mag > RADIUS) {
        const scale = RADIUS / mag;
        cx = dx * scale;
        cy = dy * scale;
      }
      knob.style.transform = `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px))`;
      this.moveX = cx / RADIUS;
      this.moveY = cy / RADIUS;
    };

    // Full-screen listener for joystick spawning on left half
    window.addEventListener('pointerdown', (e) => {
      if (stickPointerId !== null) return; // already tracking a stick
      if (e.clientX >= window.innerWidth / 2) return; // right half
      if (e.target.classList.contains('touch-btn')) return; // button element

      stickPointerId = e.pointerId;
      originX = e.clientX;
      originY = e.clientY;
      showJoystick(originX, originY);
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('pointermove', (e) => {
      if (e.pointerId !== stickPointerId) return;
      const dx = e.clientX - originX;
      const dy = e.clientY - originY;
      updateKnob(dx, dy);
      e.preventDefault();
    }, { passive: false });

    const onStickEnd = (e) => {
      if (e.pointerId !== stickPointerId) return;
      hideJoystick();
      e.preventDefault();
    };

    window.addEventListener('pointerup', onStickEnd, { passive: false });
    window.addEventListener('pointercancel', onStickEnd, { passive: false });

    // Button bindings
    const BTN_ACTIONS = {
      'btn-attack': 'attack',
      'btn-item': 'item',
      'btn-cycle': 'cycle',
      'btn-pause': 'pause',
    };

    for (const [id, action] of Object.entries(BTN_ACTIONS)) {
      const el = document.getElementById(id);
      if (!el) continue;

      el.addEventListener('pointerdown', (e) => {
        el.setPointerCapture(e.pointerId);
        input.press(action);
        e.preventDefault();
      }, { passive: false });

      const releaseBtn = (e) => {
        input.release(action);
        e.preventDefault();
      };

      el.addEventListener('pointerup', releaseBtn, { passive: false });
      el.addEventListener('pointercancel', releaseBtn, { passive: false });
      // pointerleave fires after capture is released; handle slide-off
      el.addEventListener('pointerleave', (e) => {
        // Only release if no longer captured (i.e. pointer left while captured)
        if (!el.hasPointerCapture(e.pointerId)) {
          input.release(action);
        }
      });
    }
  }
}
