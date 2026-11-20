// Tataka's Wasteland — Bala Kanda
// Source: Valmiki, Bala Kanda, sargas 24-26 (verify)
//
// Line format:   SPEAKER (mood): words     mood picks the portrait (calm, hesitant, resolute, relieved,
//                                          alert, stern, urgent, pleased, roar, cursed); it can be left out.
//                Words with no speaker are narration, shown with the lamp.
// Tags hand control to the game:
//   # panel <id>      show a painted story panel (cross-fades from the last one)
//   # look <mood>     tint the panel: dusk | dawn
//   # walk            play the walk section from the chapter data
//   # battle          play the battle from the chapter data

# panel arrival
# look dusk
The emptied country. Nothing grows here, and the wind carries grit.
VISHVAMITRA (stern): Once this was Malada and Karusha, rich and full of people.
VISHVAMITRA (stern): Tataka drove them out. Strong as a thousand elephants, she makes the land a waste.

# panel hesitation
RAMA (hesitant): She is a woman, revered one. How can I raise a bow against her?

* [Ask who she was]
    VISHVAMITRA (stern): She was born a yakshini, a nature spirit, and was cursed to become a rakshasi.
    VISHVAMITRA (stern): The curse is hers. The ruin of this land is her doing.
* [Say nothing]
    RAMA (hesitant): ...
-
VISHVAMITRA (urgent): A king's son protects the people. Do not hesitate, Rama.
RAMA (resolute): Then I will go.

# walk

# panel dust
LAKSHMANA (alert): The ground shook. She is close. I can smell the dust.
VISHVAMITRA (urgent): Before the sun sets, Rama!

# battle

# panel dawn
# look dawn
Tataka falls, and the wasteland can be lived in again.
VISHVAMITRA (pleased): Now this country can be lived in again.
RAMA (relieved): Then it was right.

# panel astras
Pleased, Vishvamitra gives Rama the divine astras, the weapons of the gods, each bowing before its new master.
-> END
