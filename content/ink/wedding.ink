// The Wedding — bala kanda
// Source: Valmiki, Bala Kanda, sargas 69-77 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene mithila
>> music court
>> cast dasharatha at 0.16
>> cast bharata at 0.07 scale=0.95
>> cast shatrughna at 0.26
>> cast janaka at 0.84 face=left
Dasharatha rides into Mithila with Bharata and Shatrughna, four days after the riders left.
JANAKA: I have two daughters, and my brother has two. You have four sons. Let us not do this by halves.
>> scene court clear
>> enter rama:prince from left to 0.2 in 0.1
>> enter sita:bride from left to 0.27 in 0.1
>> enter lakshmana:prince from left to 0.4 in 0.1
>> enter urmila from left to 0.47 in 0.1
>> enter bharata from left to 0.6 in 0.1
>> enter mandavi from left to 0.67 in 0.1
>> enter shatrughna from left to 0.8 in 0.1
>> enter shrutakirti from left to 0.87 in 0.1
>> prop fire altar at 0.535 scale=0.7
>> sound bell
Four weddings around one fire. Rama and Sita. Lakshmana and Urmila. Bharata and Mandavi. Shatrughna and Shrutakirti.
JANAKA: This is Sita, my daughter. Take her hand in yours. She will walk with you like your shadow.
>> scene chamber clear
>> prop wall kohbar at 0.56 raw=true scale=1.25
>> enter sita:bride from left to 0.14 in 0.8
In the bridal room the women of Mithila paint the wall, as they have always done. Sita holds out each piece.
>> play dragPlace \{"from":\[0.2,190\],"hint":"wedding.6","items":\[\{"kind":"lotusBamboo","to":\[0.56,210\],"text":"wedding.7"\},\{"kind":"parrot","to":\[0.44,330\],"dir":1,"text":"wedding.8"\},\{"kind":"parrot","to":\[0.68,330\],"dir":-1\},\{"kind":"fish","to":\[0.44,100\],"dir":1,"text":"wedding.9"\},\{"kind":"fish","to":\[0.68,100\],"dir":-1\},\{"kind":"sun","to":\[0.5,410\],"text":"wedding.10"\},\{"kind":"moon","to":\[0.62,410\]\},\{"kind":"jogin","dir":1,"to":\[0.4,400\],"text":"wedding.11"\},\{"kind":"jogin","dir":-1,"to":\[0.72,400\]\},\{"kind":"jogin","dir":1,"to":\[0.4,60\]\},\{"kind":"jogin","dir":-1,"to":\[0.72,60\]\}\]\}
SITA: There. Now it is a wall that has seen a wedding.
>> scene road clear
>> enter rama:prince from left to 0.3
>> enter dasharatha from left to 0.14
>> enter parashurama from right to 0.74 in 1.4
>> shake 4
>> sound bellLow
On the road home the wind turns and the birds scatter. A man with an axe stands in the way.
PARASHURAMA: I am Parashurama. I heard a bow break. You broke Shiva's, which was old and tired. Here is Vishnu's. String it, and I will fight you. Fail, and you will kneel.
DASHARATHA: He is a boy, newly married. Let him pass.
RAMA: Give it to me.
>> play holdRelease \{"who":"rama","time":1.4,"pose":\["draw1","draw2","draw2"\],"hint":"wedding.17","shake":5,"endPose":"draw2"\}
RAMA: It is strung and it is drawn. An arrow on this bow cannot be put back. Tell me where it should go.
>> pose parashurama namaste
PARASHURAMA: Not at me. I know now who holds it. Let it take my pride, and I will go back to the mountain.
>> exit parashurama to right
>> pose rama stand
>> scene city clear
They come into Ayodhya together, four sons and four brides, and the city comes out to the road.
>> wash
-> END
