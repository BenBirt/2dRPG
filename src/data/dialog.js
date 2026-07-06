// All story text, keyed by dialog id. Entries are either an array of pages
// or a function (progress) => pages, for flag-aware NPC dialog.

export const INTRO_PAGES = [
  `The storm took everything — the ship, the crew, the stars themselves.`,
  `You wake face-down in cold sand, a sword still strapped to your back and the sea hissing at your heels.`,
];

export const VICTORY_TEXT =
  `The Heartlight burns whole again, and far below, the Hollow turns over in its sleep — sealed, watched, remembered.
  The mists roll back from Brookhollow. Skeletons fall to honest bones. Dawn comes up gold over the water.
  The isle has a Warden again.`;

export const DIALOG = {
  // ----- prologue (the cove) -----
  maren_intro: [
    `An old woman waits at the top of the pass, unsurprised. "So the sea coughed up a knight. It does that, when it wants something done."`,
    `"I'm Maren, eldest of Brookhollow — what's left of it. Come down to the village, sword-bearer. There's a thing gone wrong with this isle, and precious few hands left to right it."`,
    `She turns without waiting. "Mind the dead on the way. They've stopped being polite."`,
  ],

  // ----- Brookhollow village -----
  elder_maren: (p) => {
    if (p.flags.has('d3_boss_dead')) {
      return [
        `Maren: You stood where Berrin stood, and you chose better. Or perhaps he chose for both of you, in the end.`,
        `Maren: The isle is yours to keep now, Warden. Tend the Light. And come for supper sometimes — heroes forget to eat.`,
      ];
    }
    if (p.flags.has('d2_boss_dead')) {
      return [
        `Maren: Two shards. I can feel the difference in the soil, child. Even the gulls sound braver.`,
        `Maren: The last shard lies in the Sanctum itself, behind stone no key has ever opened. Berrin's notes spoke of "walls that remember being whole." Perhaps something loud could remind them otherwise.`,
      ];
    }
    if (p.flags.has('d1_boss_dead')) {
      return [
        `Maren: A shard of the Heartlight! Let me look at you — not a scratch. Well. Not many scratches.`,
        `Maren: The second shard sank with the Drowned Cellars, east past the marsh. The way in is sealed by an old warden-eye. They only ever opened for a true shot. Saltbeard down at the docks knows the stories.`,
      ];
    }
    return [
      `Maren: So the sea coughed up a knight. I am Maren — eldest of Brookhollow, which means I bury the others and remember the rest.`,
      `Maren: A generation ago, our guardian — the Warden Berrin — shattered the Heartlight into three shards and vanished below. No one knows why. The isle has been dying by inches ever since.`,
      `Maren: The first shard rests in the Bramble Crypt, north through the wood. Take your sword. The dead there have stopped being polite.`,
    ];
  },

  saltbeard: (p) => {
    if (p.flags.has('d2_gate_open')) {
      return [
        `Saltbeard: Hah! You opened the old eye-gate! Forty years I've thrown rocks at that thing. Rocks, lad. The shame of it.`,
      ];
    }
    if (p.flags.has('d1_boss_dead')) {
      return [
        `Saltbeard: The Drowned Cellars? Aye, east of here, past the marsh — you'll see the warden-eye set over the gate, staring like my first wife.`,
        `Saltbeard: It only opens for an arrow through the pupil. The old wardens were show-offs like that. Got a bow now, don't you? Saw the crypt-light change. Whole village saw.`,
      ];
    }
    return [
      `Saltbeard: New face! Good. The old faces keep getting eaten. I'm Saltbeard. I fish, I drink, I watch the mist eat my island.`,
      `Saltbeard: You want advice? The crypt north of the wood. Start there. And if you find my anchor, it's mine.`,
    ];
  },

  brena: (p) => {
    if (p.hasBombs) {
      return [
        `Brena: Blasting powder?! Where did— no. No, I don't want to know. Keep it dry and keep it FAR from my forge.`,
      ];
    }
    if (p.hasBow) {
      return [
        `Brena: That's old warden fletching on those arrows. Crypt-kept, dry as bone. They'll fly true — truer than the man who left them there, anyway.`,
      ];
    }
    return [
      `Brena: I'm Brena. I shoe horses we no longer have and sharpen swords for people who don't come back. You look like you'll come back. Don't make a liar of me.`,
    ];
  },

  village_kid: (p) => {
    if (p.flags.has('d3_boss_dead')) {
      return [`Pip: The mist's GONE! Ma says I can play past the fence again. Did you do that? Maren says you did that. Tam won't stop talking about you.`];
    }
    if (p.hasBow) {
      return [`Pip: Is that a REAL warden-bow? Can I hold it? …No? What if I close my eyes. …Fine. Bet you can't hit the weathervane on Brena's forge. Bet you can't.`];
    }
    return [
      `Pip: I'm not scared of the mist. But if you hear it knocking, you shouldn't open anything. That's what Tam did — and Tam came back all quiet and wrong. He's better now. Mostly.`,
    ];
  },

  // Tam — the boy who opened a door he shouldn't have; comic-melancholy.
  villager_tam: (p) => {
    if (p.flags.has('d1_boss_dead')) {
      return [`Tam: I heard the crypt go quiet. I FELT it go quiet. That's the first time the inside of my head's been my own since… since the knocking. Thank you. Don't tell Pip I cried.`];
    }
    return [
      `Tam: …oh. Sorry. I do that — drift off. Ever since the mist got in, part of me is always somewhere cold, listening for the knocking.`,
      `Tam: If you're going into the crypt: the dead in there aren't sleeping anymore. They're WAITING. There's a difference. I can hear it.`,
    ];
  },

  // ----- signs & overworld -----
  sign_village: ['BROOKHOLLOW — pop. 31 and holding.\nThe mist is not a door. Do not knock back.'],
  sign_crypt: ['BRAMBLE CRYPT\nLaid down in better years. The dead of Vessa rest here.\n(They used to, anyway.)'],
  sign_cellars: ['THE DROWNED CELLARS\nWarden storehouse. Sealed by the watching eye.\nTrue shots only.'],
  sign_sanctum: ['THE SANCTUM OF THE HEARTLIGHT\nNo key was cut for this door.\nThe wall remembers being whole.'],

  // ----- dungeon lecterns: the Warden's story, found in order -----
  d1_note: [
    `The handwriting is careful, old: "First shard sleeps with the honored dead. Forgive me. A divided light casts no shadow deep enough to wake what sleeps beneath. — B."`,
  ],
  d2_entry: [
    `A warden's ledger, swollen with damp: "Stores for thirty winters. If the pumps fail, the lower vaults go first. If the EYE closes of its own accord… stop reading and run."`,
  ],
  d2_note: [
    `Water has warped the page, but the words hold: "They call it Heartlight and never ask whose heart. I have heard it beating under the isle. It is not OURS. The light feeds it. I will starve it. — B."`,
  ],
  d3_note: [
    `The last page, pinned beneath a gauntlet: "I was wrong. Starved, it dreams hungrier. The Light must burn WHOLE — but tended, watched, wielded. It needed a Warden, not a wall. I haven't the years left to be either. Whoever reads this: be both. — Berrin."`,
  ],

  // ----- item gets -----
  get_bow: [
    `You found the Warden's Bow!\nLoose arrows with the item button (K on a keyboard, A on touch).`,
    `The wardens sealed their vaults with watching eyes that open only for a true shot. One such eye waits beside the gate east of Brookhollow — but first, the crypt's guardian still stands between you and the shard.`,
  ],
  get_bombs: [`You found Blasting Powder!\nPlace bombs with the item button. Cracked, ancient walls will not survive it.`],
  get_boss_key: [`You found the Boss Key!\nSomewhere in this place, a sealed door is waiting for it.`],
  get_small_key: [`You found a Small Key.`],
  get_heart_container: [`Your vigor grows!\nMaximum hearts increased by one.`],
  get_shard1: [`You recovered the First Shard of the Heartlight!\nIt hums against your palm like a remembered song. Two remain.`],
  get_shard2: [`You recovered the Second Shard of the Heartlight!\nIt is heavier than the first — or perhaps it is just carrying more dark. One remains.`],
  get_shard3: [
    `You recovered the Last Shard of the Heartlight!`,
    `The three shards pull toward each other like old friends across a room. Where the Colossus fell, the Warden's armor lies still at last — and in the quiet, far beneath your feet, something stops listening.`,
    `You raise the Heartlight, whole. This time, it will be tended. This time, it has a Warden.`,
  ],
};

export function getDialog(id, progress) {
  const entry = DIALOG[id];
  if (!entry) return [`(missing dialog: ${id})`];
  return typeof entry === 'function' ? entry(progress) : entry;
}
