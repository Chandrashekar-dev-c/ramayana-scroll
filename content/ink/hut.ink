// The Empty Hut — aranya kanda
// Source: Valmiki, Aranya Kanda, sargas 57-68 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene panchavati style=bharni-earth
>> music grief
>> cast rama:exile at 0.2
>> prop hut hut at 0.56 scale=0.9 colour=false
>> enter lakshmana:exile from right to 0.4 in 1
Rama meets Lakshmana on the path, coming toward him, alone.
RAMA: You left her.
LAKSHMANA: She said things I could not stand and hear. I was wrong to go. I knew it as I went.
They run. The clearing is as they left it, and it is empty.
>> play tapSpots \{"hint":"hut.5","spots":\[\{"at":0.56,"y":60,"label":"hut.6","text":"hut.7"\},\{"at":0.34,"y":30,"label":"hut.8","icon":"flower","text":"hut.9"\},\{"at":0.8,"y":40,"label":"hut.10","icon":"ornament","text":"hut.11"\}\]\}
>> pose rama raise
RAMA: Kadamba tree, you loved her. Did you see? Deer, where is she? You, river. Will none of you answer?
>> pose rama draw2
>> shake 4
RAMA: Then I will ask no more. I will empty the sky of its gods and leave the three worlds dark.
>> move lakshmana to 0.32 in 0.6
>> pose lakshmana namaste
LAKSHMANA: For one man's crime? You are the one who is patient. Be that now. We will find who did it, and then use the bow.
>> pose rama stand
>> scene forest clear
>> enter jatayu from right to 0.66 in 0.1
>> set jatayu pose=grieve
>> enter rama:exile from left to 0.4 in 1
>> enter lakshmana:exile from left to 0.26 in 1.2
Not far off they find the great vulture in a wreck of broken chariot, breathing blood.
JATAYU: Ravana. King of the rakshasas. He took her south. I could not... I am glad I saw you.
>> pose rama kneel
>> move rama to 0.56 in 1
He dies with his head in Rama's hands.
RAMA: He was my father's friend, and he died for me as my father did. He will have a son's rites.
>> prop pyre pyre at 0.74 state=0
>> set jatayu visible=false
>> play tapSpots \{"hint":"hut.19","ordered":true,"spots":\[\{"at":0.74,"y":70,"icon":"flower","label":"hut.20"\},\{"at":0.74,"y":20,"label":"hut.21","ops":\[\{"do":"prop","id":"pyre","name":"pyre","at":0.74,"state":1\}\],"cue":"fireWhoosh"\}\]\}
They go south.
>> wash
-> END
