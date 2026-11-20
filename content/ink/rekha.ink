// The Lakshmana Rekha — aranya kanda
// Source: Valmiki, Aranya Kanda, sargas 45-49 (verify) (later tradition)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene panchavati style=bharni-earth
>> music dark
>> cast sita:exile at 0.5
>> cast lakshmana:exile at 0.72 face=left
>> prop hut hut at 0.5 scale=0.9
At the hut, the cry comes through the trees. Sita is on her feet before it ends.
SITA: That was his voice. Go to him. Why are you standing there?
LAKSHMANA: Nothing in the three worlds can hurt him. That was a trick. He told me to stay with you, and I will.
SITA: You will stand here while he dies. I see what you are. You have waited for this.
>> pose lakshmana hurt
It is a terrible thing to say, and she is too frightened to hear herself say it. He stands as if she had struck him.
>> pose lakshmana namaste
LAKSHMANA: I will go. May the gods of this forest keep you. I do not think I am doing right.
>> pose lakshmana hold
>> play trace \{"rect":\[0.34,0.66\],"h":300,"hint":"rekha.7"\}
LAKSHMANA: Do not step over this line. Whatever comes, it cannot cross it.
>> exit lakshmana to right in 1
>> music silence
The line shines a little in the empty clearing. The forest goes quiet. The birds leave the sky.
>> enter ravana:ascetic from left to 0.12 in 2.2
An ascetic in saffron comes down the path, with a staff and a water pot, chanting.
_: A guest stands at your door, lady, and he has eaten nothing today.
>> move ravana to 0.3 in 1.2
>> prop rekha rekha at 0 rect=\[0.34,0.66\] h=300 state=flare
>> shake 3
>> sound starBell
>> move ravana to 0.24 in 0.5 keepface
At the line he stops as if he had walked into a wall. It flares white.
>> prop rekha rekha at 0 rect=\[0.34,0.66\] h=300
_: I have taken a vow not to enter a house. Will you send a hungry man away from it?
A guest who asks at the door must be fed. It is the first duty of a house, and she has kept it all her life.
>> pose sita give
>> move sita to 0.31 in 1.6
>> prop rekha rekha at 0 rect=\[0.34,0.66\] h=300 state=out
>> sound bellLow
She steps across with the food in her hands. The line goes out.
>> set ravana stage=king mode=colour
>> shake 8
>> music lanka
The saffron falls away. Ten heads, gold and black.
His hand closes on her arm. She is not lifted easily: she twists, she pulls, she strikes at the ten faces.
>> play mash \{"who":"sita","futile":9,"hint":"rekha.struggle"\}
But he has arms enough to hold a mountain, and one by one they close around her. The ground leaves her feet.
>> scene sky clear
>> prop pushpaka pushpaka at 0.5 y=-260 raw=true
>> enter ravana from left to 0.46 in 0.1 y=-290 pose=sit scale=0.7
>> enter sita:exile from left to 0.54 in 0.1 y=-290 scale=0.8
>> set sita pose=sit
The Pushpaka rises over the trees.
SITA: Trees of Janasthana! River Godavari! Deer, birds, all of you: tell Rama. Tell him Ravana has taken me.
-> END
