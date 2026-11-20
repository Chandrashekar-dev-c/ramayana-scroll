// In Ravana's Court — sundara kanda
// Source: Valmiki, Sundara Kanda, sargas 41-52 (verify) (later tradition)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene grove style=kachni
>> music flight
>> cast hanuman at 0.2 mode=colour
He could go home now. But a messenger who has not seen the enemy's strength has done half his work. He looks at the pleasure garden.
>> play tapSpots \{"hint":"court.2","spots":\[\{"at":0.4,"y":60,"icon":"tree","vanish":true,"cue":"thud","r":80\},\{"at":0.56,"y":60,"icon":"pavilion","vanish":true,"cue":"boulder","r":80\},\{"at":0.72,"y":60,"icon":"tree","vanish":true,"cue":"thud","r":80\},\{"at":0.88,"y":60,"icon":"pavilion","vanish":true,"cue":"boulder","r":80\}\]\}
He leaves one tree standing: the one she sits under.
>> enter guard from right to 0.7 in 0.8
>> enter aksha from right to 0.84 in 1
>> pose hanuman swing0
Guards come in their thousands. He fights with an iron gate-bar. Ravana sends his youngest son, Aksha, who is brave, and a boy.
>> pose hanuman swing1
>> set guard pose=hurt
>> set aksha pose=hurt
>> shake 4
Hanuman admires how he fights. He kills him anyway, and is sorry.
>> set guard visible=false
>> set aksha visible=false
>> enter indrajit from right to 0.74 in 1
>> pose indrajit cast
>> pose hanuman hurt
Then Indrajit comes, and looses the Brahma astra. Hanuman could break it. He lets himself be bound: it will take him where he wants to go.
>> scene lankaCourt clear
>> prop throne throne at 0.74
>> enter ravana from right to 0.74 in 0.1 y=-70
>> set ravana pose=sit face=-1
>> enter vibhishana from right to 0.56 in 0.1
>> set vibhishana face=-1
>> enter minister from right to 0.9 in 0.1
>> enter hanuman from left to 0.24 in 1 colour=true
>> music lanka
The court of Lanka. Hanuman looks at the king on his throne and thinks: if he were not so wrong, he could rule heaven.
HANUMAN: I bring a message from Sugriva, king of the vanaras, and from Rama. Give Sita back. You know the law as well as any priest. Do not throw away all this for one theft.
* [Sit level with him first. (Later tradition)]
  -> tail
* [Stand and wait for his answer.]
  -> ans
-> tail
= tail
>> play hold \{"who":"hanuman","visual":"tail","time":2.4,"hint":"court.11"\}
He coils his tail under him until he sits as high as the throne. No envoy stands lower than the king he speaks to.
-> ans
= ans
>> pose ravana point
RAVANA: Kill it.
VIBHISHANA: Brother, no. He is a messenger. Punish him, shame him if you must. A king who kills an envoy has no law left.
RAVANA: A monkey loves its tail. Set fire to it. Lead him through the streets.
>> prop coil remove
-> END
