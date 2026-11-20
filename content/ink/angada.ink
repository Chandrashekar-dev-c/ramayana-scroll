// Angada's Foot — yuddha kanda
// Source: Valmiki, Yuddha Kanda, sargas 41 (verify) (later tradition)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene camp style=bharni-earth
>> music vanara
>> cast rama:exile at 0.3
>> cast angada at 0.56 face=left
RAMA: One more time, before anyone dies. Go to him, Angada. Say: give her back, and live. Say it so he can hear it.
>> scene lankaCourt clear style=kachni
>> prop throne throne at 0.74
>> enter ravana from right to 0.74 in 0.1 y=-70 mode=kachni
>> set ravana pose=sit face=-1
>> enter angada from left to 0.3 in 1.2
ANGADA: I am Angada, son of Vali. You may remember my father: he carried you under his arm. Rama says: return Sita and ask her pardon, or I will leave the world without a rakshasa in it.
>> pose ravana point
RAVANA: Take him.
>> enter guard from right to 0.44 in 0.5 mode=kachni
>> enter guard2 from left to 0.18 in 0.5 as=guard mode=kachni
Four rakshasas take hold of his arms. He lets them.
>> play holdRelease \{"who":"angada","time":1.1,"pose":\["crouch","crouch","crouch"\],"endPose":"jump","shake":8,"cue":"boulder","hint":"angada.5","ops":\[\{"do":"set","who":"guard","visible":false\},\{"do":"set","who":"guard2","visible":false\}\]\}
He goes straight up with all four hanging from him, shakes them off like water, kicks the gold pinnacle off the palace roof, and is gone.
* [Before he goes: the planted foot. (Later tradition)]
  -> foot
* [Return to Rama.]
  -> back
-> foot
= foot
>> set angada pose=stand y=0
ANGADA: I will make it simple. Here is my foot. If any one of you can move it, Rama will go home without her.
>> enter guard from right to 0.42 in 0.6 mode=kachni
>> set guard visible=true pose=swing0
>> play mash \{"who":"guard","need":12,"futile":5,"hint":"angada.10"\}
They try one after another, generals and princes. It is like pushing the earth. When Ravana himself rises, Angada steps back: "Touch Rama's feet, not mine."
-> back
= back
>> scene camp clear
>> enter rama:exile from left to 0.3 in 0.1
>> enter angada from right to 0.56 in 1
ANGADA: He heard it. He will not do it.
>> music war
>> sound drum
The drums begin.
-> END
