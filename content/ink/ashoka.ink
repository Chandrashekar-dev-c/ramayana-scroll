// The Ashoka Grove — sundara kanda
// Source: Valmiki, Sundara Kanda, sargas 14-40 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene grove style=kachni
>> music lanka
>> cast sita:exile at 0.56 pose=sit face=left mode=colour
>> cast rakshasi at 0.76 face=left
>> cast trijata at 0.9 pose=sit face=left
>> prop tree shimshapa at 0.56 raw=true
Dawn. From the leaves of a shimshapa tree he sees a woman on the ground, thin, in one soiled cloth, like a flame nearly out. He knows her at once.
>> enter ravana from left to 0.22 in 1.6
>> enter mandodari from left to 0.08 in 1.8
Before he can move, the king comes, with torches and women, half awake.
>> pose sita stand
>> play resolve \{"from":"ravana","threats":\["ashoka.3","ashoka.4","ashoka.5"\],"ops":\[\{"do":"prop","id":"grass","name":"grassBlade","at":0.4\}\]\}
SITA: You stole me when he was away, like a dog stealing from an altar. He will come. Look to your city.
>> exit ravana to left nowait
>> exit mandodari to left
>> move rakshasi to 0.68 in 0.6
>> pose rakshasi swing0
RAKSHASI: Say yes, fool, or we will share you out tonight.
>> pose trijata stand
TRIJATA: Eat me instead. I have had a dream. I saw Rama on a white elephant, and her beside him. I saw Ravana in red, riding south on a donkey. Ask her pardon while you can.
>> pose rakshasi stand
>> move rakshasi to 0.94 in 1
>> pose sita sit
They draw back. And from the tree above her, very softly, someone begins to tell a story: there was a king named Dasharatha...
>> enter hanuman from left to 0.36 in 1.2 scale=0.6 colour=true
>> pose hanuman namaste
>> pose sita stand
SITA: If you are Ravana in another shape, this is cruel. If you are not, say his name again.
HANUMAN: I am Hanuman, messenger of Rama. He does not sleep. He sent you this.
>> prop ring ring at 0.46 y=-110 raw=true front=true colour=true
>> play tapSpots \{"hint":"ashoka.12","spots":\[\{"at":0.46,"y":124,"cue":"bell","ops":\[\{"do":"wash"\},\{"do":"prop","id":"ring","remove":true\}\]\}\]\}
She holds it as if it were his hand.
HANUMAN: Climb on my back. You will be with him by tonight.
SITA: I will not be stolen twice, even by a friend. Let him come and take me back himself. That is what is worthy of him.
>> pose sita give
>> play tapSpots \{"hint":"ashoka.16","spots":\[\{"who":"sita","y":150,"icon":"ornament","cue":"chime"\}\]\}
SITA: Give him this. And tell him what only he knows: at Chitrakuta a crow tore at me, and he took a blade of grass and made it an astra, and it chased that crow through three worlds.
>> pose sita stand
SITA: Tell him I can live one month more.
-> END
