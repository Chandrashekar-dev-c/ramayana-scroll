// Lakshmana Falls — yuddha kanda
// Source: Valmiki, Yuddha Kanda, sargas 100-101 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene battlefield style=kachni
>> music war
>> cast lakshmana:exile at 0.36 pose=draw2 mode=colour
>> cast ravana at 0.72 pose=cast face=left
Ravana rides out. Lakshmana meets him, and breaks his bow. Ravana takes up the spear, eight bells along its shaft, made by the architect of the demons.
>> pose ravana swing1
>> pose lakshmana hurt
>> shake 8
>> sound thunder
>> wait 0.6
>> set lakshmana pose=dead rot=1.45 y=-40
It strikes him in the chest, and he falls.
>> move ravana to 0.48 in 1
>> pose ravana hold
Ravana, who once lifted Mount Kailash, bends to carry him off as a prize. He cannot move him.
>> enter hanuman from left to 0.2 in 0.8 colour=true
>> pose hanuman swing1
>> set ravana pose=hurt
>> move ravana to 0.8 in 0.5 keepface
Hanuman strikes Ravana once in the chest with his fist, and lifts Lakshmana as easily as a friend.
>> scene tamasa clear
>> music grief
>> enter rama:exile from left to 0.46 in 0.1 colour=true
>> set rama pose=kneel
>> enter lakshmana:exile from left to 0.56 in 0.1 colour=true
>> set lakshmana pose=dead rot=1.45 y=-40
>> enter hanuman from left to 0.22 in 0.1 colour=true
>> enter sushena from right to 0.8 in 0.1 colour=true
Night. Rama pulls the spear out and breaks it, and sits down on the ground with his brother's head in his lap.
>> play hold \{"visual":"night","time":16,"endure":true,"hint":"falls.6","cue":"bellSoft","texts":\["falls.7","falls.8","falls.9","falls.10","falls.11"\]\}
SUSHENA: He breathes. His face has colour. There are four herbs on a mountain in the north, between Kailash and Rishabha. If they are here before the sun, he will live.
>> pose hanuman jump
>> exit hanuman to left in 0.8 y=-500
>> sound thunder
Hanuman is already in the air.
-> END
