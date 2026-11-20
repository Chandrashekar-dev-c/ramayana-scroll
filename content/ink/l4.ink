// Waking the Brother — yuddha kanda, Lanka
// Source: Valmiki, Yuddha Kanda, sargas 35, 59-65 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene lankaCourt style=kachni
>> music lanka
>> cast ravana at 0.3 pose=sit y=-70
>> cast malyavan at 0.6 face=left
>> prop throne throne at 0.3
>> title Meanwhile, in Lanka / Waking the Brother
MALYAVAN: I am your mother's father, and too old to flatter you. A king makes peace with an equal or a stronger. Give her back.
RAVANA: I would rather break than bend. It is the fault I was born with. Go home, grandfather.
>> exit malyavan to right
>> scene battlefield clear
>> enter ravana from right to 0.7 in 0.1
>> set ravana face=-1 pose=hurt
>> prop wreck chariot at 0.82 broken=true raw=true dir=-1
>> enter rama:exile from left to 0.26 in 0.1 colour=true
>> set rama pose=shoot
He rides out himself, and for the first time sees the man. Rama cuts down his banner, his horses, his chariot, his bow. Then his crown.
RAMA: You have fought well, and you are tired, and you have no weapon. I will not kill you today. Go and rest. Come back tomorrow with a chariot.
>> scene lankaCourt clear
>> prop throne throne at 0.3
>> enter ravana from left to 0.3 in 0.1
>> set ravana pose=stand y=0 face=1
No one has ever spared him before. It is worse than a wound.
RAVANA: Wake Kumbhakarna.
>> scene cave clear
>> enter kumbhakarna from right to 0.66 in 0.1 scale=0.62
>> set kumbhakarna pose=dead rot=-1.5 y=-60
He sleeps six months at a time, by a boon that went wrong. They bring drums, conches, a thousand elephants, and a hill of rice.
>> play rhythm \{"need":6,"streak":true,"bpm":92,"icon":"drum","cue":"drum","hint":"l4.10"\}
>> set kumbhakarna pose=stand rot=0 y=0
>> shake 8
>> sound thunder
He sits up, eats the hill, and asks who is at the gate.
>> scene lankaCourt clear
>> prop throne throne at 0.3
>> enter ravana from left to 0.3 in 0.1
>> enter kumbhakarna from right to 0.74 in 1.4 scale=0.62
KUMBHAKARNA: I told you in council what would come of this. You were wrong, brother.
RAVANA: I did not wake you for a sermon.
KUMBHAKARNA: No. You woke me to die for you. I will, anyway.
>> heads \{"voices":\["brother","pride","fear","father"\],"lines":\{"brother":"l4.15","pride":"l4.16","fear":"l4.17","father":"l4.18"\}\}
The brother speaks loudest, this once. Ravana lets him go all the same.
-> END
