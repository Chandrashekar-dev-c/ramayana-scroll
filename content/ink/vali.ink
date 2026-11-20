// Vali and Sugriva — kishkindha kanda
// Source: Valmiki, Kishkindha Kanda, sargas 12-26 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene kishkindha style=bharni-earth
>> music forest-battle
>> cast rama:exile at 0.14
>> cast lakshmana:exile at 0.06
>> cast sugriva at 0.56
>> cast vali at 0.8 face=left
Sugriva goes to the gate of Kishkindha and roars for his brother. Vali comes out.
>> pose sugriva swing0
>> pose vali swing1
>> shake 3
From the trees Rama watches two golden monkeys fight, alike as the two Ashvins. He cannot tell which is which, and does not shoot.
>> pose sugriva hurt
>> set sugriva face=-1
>> move sugriva to 0.3 in 0.8 keepface
>> exit vali to right nowait
SUGRIVA: You watched him break me! Was this the help you swore?
RAMA: I could not tell you apart. If I had killed you, what would my oath be worth? Go again. This time I will know you.
>> move lakshmana to 0.24 in 0.8
Lakshmana pulls up a flowering creeper and hangs it around Sugriva's neck.
>> scene cave clear
>> enter vali from left to 0.4 in 0.1
>> enter tara from right to 0.62 in 1
TARA: He was beaten an hour ago and he is back, shouting. He has found someone. The sons of Dasharatha are in this forest. Make peace with your brother.
VALI: I will not kill him. I will only take the pride out of him. Do not be afraid.
>> scene kishkindha clear
>> enter rama:exile from left to 0.14 in 0.1
>> enter sugriva from left to 0.6 in 0.1
>> enter vali from right to 0.72 in 0.6
>> play duel \{\}
>> set vali pose=grieve at=0.62
>> set sugriva pose=stand at=0.8 face=-1
>> move rama to 0.4 in 1.4
>> music grief
VALI: I was fighting another, and my back was to you. I had no quarrel with you. They say you are just. Why did you shoot from hiding?
RAMA: You took your brother's wife while he lived. This land answers to the kings of my house, and a king must punish that. I punished it.
Vali listens. Whether he is satisfied, the poem does not quite say. He says: I should not have spoken so.
>> enter angada from right to 0.74 in 1
>> enter tara from right to 0.9 in 1.2
>> pose tara grieve
VALI: Sugriva. Look after Angada. He is a boy. Rama, he is yours now too.
He takes the gold necklace Indra gave him from his own neck, puts it on his brother, and dies.
>> set vali visible=false
>> pose sugriva grieve
>> wait 1.2
>> scene kishkindha clear
>> enter sugriva from left to 0.5 in 0.1
>> enter angada from left to 0.66 in 0.1
>> enter hanuman from left to 0.34 in 0.1
>> sound bell
>> music vanara
Sugriva is crowned king of the vanaras, and Angada crown prince. Rama, who may not enter a city, watches from the hill.
>> wash
-> END
