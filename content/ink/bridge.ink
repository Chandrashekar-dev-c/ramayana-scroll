// The Bridge — yuddha kanda
// Source: Valmiki, Yuddha Kanda, sargas 21-22 (verify) (later tradition)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene shore style=bharni-earth
>> music vanara
>> cast rama:exile at 0.3 pose=sit
>> cast lakshmana:exile at 0.18
The southern shore. Rama lies down on sacred grass facing the sea, and asks the Ocean to let his army pass. One day. Two. Three.
The Ocean does not answer.
>> pose rama stand
RAMA: Gentleness is taken for weakness. Bring my bow, Lakshmana. Today the vanaras will cross on foot, over dry sand.
>> play holdRelease \{"who":"rama","time":1.6,"pose":\["draw1","draw2","draw2"\],"endPose":"draw2","after":0.4,"hint":"bridge.4","shake":7,"cue":"thunder"\}
>> enter ocean from right to 0.7 in 1.6
>> pose ocean namaste
The water boils. Fish and great serpents flee to the bottom. And out of the waves, with folded hands, comes the Ocean himself.
OCEAN: Earth, wind, sky, water and fire keep to their natures, Rama. Mine is to be deep. I cannot stand aside. But there is a vanara with you named Nala, a builder's son. What he lays on me, I will hold.
RAMA: This arrow cannot be put back. Where shall it fall?
OCEAN: North, on a coast where robbers drink my water.
>> pose rama shoot
>> sound release
>> wait 0.5
>> pose rama stand
>> exit ocean to right
>> enter nala from left to 0.42 in 1
>> prop bridge bridge at 0.44 state=0 raw=true width=620
NALA: I can do it. I did not like to say so before I was asked.
>> play rhythm \{"need":14,"bpm":84,"icon":"stone","prop":"bridge","cue":"thud","hint":"bridge.10"\}
Fourteen yojanas the first day. Twenty the second. By the fifth, a hundred, straight as a parting in hair.
* [A squirrel is helping. (Later tradition)]
  -> sq
* [Cross.]
  -> cross
-> sq
= sq
A squirrel wets itself in the sea, rolls in the sand, and runs to shake the grains out between the stones. The vanaras laugh. Rama picks it up.
He strokes its back with three fingers. Squirrels have had three stripes ever since.
-> cross
= cross
>> music war
The army crosses to Lanka.
>> wash
-> END
