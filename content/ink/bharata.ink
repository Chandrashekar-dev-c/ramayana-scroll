// Bharata at Chitrakuta — ayodhya kanda
// Source: Valmiki, Ayodhya Kanda, sargas 67-119 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene cityNight
>> music grief
>> cast bharata at 0.3
>> cast kaikeyi at 0.66 face=left
Bharata rides into a city with no lamps lit and no one in the streets.
KAIKEYI: Your father is dead. Rama is in the forest. The kingdom is yours. I did it for you.
BHARATA: For me? You have killed my father and made me a thief before the whole world. I will not have it. I will not have you call me son.
He performs his father's rites. On the fourteenth day the ministers bring him the crown, and he sends it back.
>> scene riverbank clear
>> enter bharata from left to 0.3 in 1
>> enter guha from right to 0.72 in 1
He sets out for the forest with the army, the three queens and half the city. At the Ganga, Guha sees an army hunting his friend.
GUHA: If you mean him harm, you will not cross this river.
BHARATA: I mean to put him on the throne and take his place in the forest. Show me where he slept.
Guha shows him the flattened grass. Bharata looks at it for a long time. Then Guha gives him five hundred boats.
>> scene chitrakuta clear
>> prop hut hut at 0.82 scale=0.8
>> enter rama:exile from right to 0.66 in 0.1
>> enter lakshmana:exile from right to 0.56 in 0.1
>> set lakshmana pose=draw1 face=-1
>> set rama face=-1
LAKSHMANA: Dust, and banners. It is Bharata, come with an army to finish what his mother began.
RAMA: Wait. If I asked Bharata for the kingdom he would give it. You know him. Wait and see how he comes.
>> pose lakshmana stand
>> enter bharata from left to 0.1 in 0.8
>> play walkTo \{"who":"bharata","to":0.54,"speed":140,"hint":"bharata.11"\}
>> pose bharata grieve
>> move lakshmana to 0.76 in 0.8
BHARATA: Our father is dead. He died saying your name.
>> pose rama grieve
>> music grief
>> wait 1.2
Rama goes down to the river Mandakini, and offers water and the forest fruit he lives on. It is what he has to give.
>> pose rama stand
>> pose bharata kneel
>> prompt How does Bharata plead?
* ["The throne is yours by birth. I am only keeping it warm."]
  -> a1
* ["Our mother was wrong. A wrong boon need not be kept."]
  -> a2
* ["The people are outside. They did not come for me."]
  -> a3
-> a1
= a1
RAMA: It was his to give, and he gave it to you. I will not take back what my father gave away.
-> after
-> a2
= a2
RAMA: Do not blame her, or him. A promise is not kept only when it is easy.
-> after
-> a3
= a3
RAMA: Then give them a good king for fourteen years. They have one in front of them.
-> after
= after
BHARATA: Then give me your sandals. Step on them once. They will rule Ayodhya. I will only carry out their orders.
>> pose rama give
>> wait 0.6
>> pose rama stand
>> pose bharata carry
>> set bharata face=-1
>> play walkTo \{"who":"bharata","to":0.08,"speed":130,"carry":"carry","hint":"bharata.22"\}
>> scene nandigram clear
>> prop seat sandalsThrone at 0.62 state=0
>> enter bharata from left to 0.3 in 1
>> pose bharata carry
He does not go back to the palace. In the village of Nandigram, outside the walls, he sets up a throne.
>> play tapSpots \{"hint":"bharata.24","spots":\[\{"at":0.62,"y":160,"ops":\[\{"do":"prop","id":"seat","name":"sandalsThrone","at":0.62,"state":1\},\{"do":"pose","who":"bharata","pose":"namaste"\}\],"cue":"bell"\}\]\}
>> set bharata 
Each matter of the kingdom is brought before the sandals first.
>> prompt Two farmers dispute a boundary stone.
* [Send a surveyor, and feed both families until he rules.]
  -> r1
* [Let the elders of their village decide.]
  -> r1
-> r1
= r1
BHARATA: So ordered, in Rama's name.
>> prompt The spring festival falls in a year of mourning.
* [Hold it, quietly. The children should have it.]
  -> r2
* [Hold it at the temples only.]
  -> r2
-> r2
= r2
BHARATA: So ordered, in Rama's name.
>> prompt The rains fail in the east.
* [Open the royal granaries.]
  -> r3
* [Remit the year's tax, and dig tanks.]
  -> r3
-> r3
= r3
BHARATA: So ordered, in Rama's name.
He wears bark and sleeps on the ground, and counts the years.
>> scene hermitage clear
>> enter sita:exile from left to 0.4 in 1
>> enter anasuya from right to 0.62 in 1
>> enter atri from right to 0.84 in 1
Rama leaves Chitrakuta, which reminds him too much of home, and goes south. At the hermitage of Atri, the sage's wife takes Sita aside.
>> pose anasuya give
ANASUYA: You followed him. That was hard, and right. Take these: a garland, a cloth, ornaments. They will never fade or soil.
>> scene nandigram clear
>> prop seat sandalsThrone at 0.62 state=1
>> wash
-> END
