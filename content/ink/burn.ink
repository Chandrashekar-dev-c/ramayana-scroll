// Lanka Burns — sundara kanda
// Source: Valmiki, Sundara Kanda, sargas 53-65 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene lanka style=kachni
>> music flight
>> cast hanuman at 0.4 mode=colour
>> cast guard at 0.6 face=left
>> cast guard2 at 0.24
They wrap his tail in cotton, soak it in oil and light it. They lead him through every street, which lets him see every street.
>> set hanuman scale=0.4
>> wait 0.5
>> pose hanuman jump
Then he makes himself small, and the ropes fall off. He jumps to the nearest roof.
>> play burn \{\}
>> scene lankaRoofs clear
>> enter hanuman from left to 0.5 in 0.1 colour=true
>> set hanuman pose=hurt
HANUMAN: What have I done? The grove. If the fire has reached her, I have killed what I came to save.
He hears the spirits of the air say: the whole city burns, and the daughter of Janaka is untouched. He breathes.
>> scene ocean clear
He puts his tail out in the sea, and leaps north.
>> scene forest clear
>> music vanara
>> enter angada from left to 0.3 in 0.1
>> enter hanuman from left to 0.44 in 0.1 colour=true
>> enter vanara from left to 0.62 in 0.1
>> enter vanara2 from left to 0.76 in 0.1 as=vanara scale=0.9
On the way home the search party passes Madhuvana, Sugriva's own honey forest. They have good news and they have had a hard month.
>> play tapSpots \{"hint":"burn.7","spots":\[\{"at":0.5,"y":260,"icon":"honey","vanish":true,"cue":"place"\},\{"at":0.66,"y":300,"icon":"honey","vanish":true,"cue":"place"\},\{"at":0.8,"y":250,"icon":"honey","vanish":true,"cue":"place"\},\{"at":0.9,"y":310,"icon":"honey","vanish":true,"cue":"place"\}\]\}
The keeper of the forest runs to Sugriva to complain. Sugriva laughs out loud. No one who had failed would dare.
>> scene kishkindha clear
>> enter rama:exile from right to 0.66 in 0.1
>> set rama face=-1
>> enter hanuman from left to 0.36 in 1 colour=true
>> pose hanuman namaste
HANUMAN: I have seen Sita.
>> pose hanuman give
He puts the crest jewel in Rama's hand.
RAMA: I have nothing to give you that is worth this. Only this.
>> move rama to 0.46 in 0.8
>> pose rama give
He embraces him.
>> scene lanka
>> set rama visible=false
>> set hanuman visible=false
>> wash
-> END
