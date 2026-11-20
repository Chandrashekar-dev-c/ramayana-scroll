// Indrajit — yuddha kanda
// Source: Valmiki, Yuddha Kanda, sargas 44-50, 84-91 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene battlefield style=kachni
>> music lanka
>> cast rama:exile at 0.36 pose=grieve mode=colour
>> cast lakshmana:exile at 0.5 pose=grieve mode=colour
>> prop cc cloudChariot at 0.76 y=-360 raw=true
An earlier night. Indrajit fights from inside a cloud, where no one can see him. His arrows turn to serpents as they strike.
>> prop n1 naga at 0.36 raw=true
>> prop n2 naga at 0.5 raw=true dir=-1
>> sound coilHiss
Both brothers lie bound and still. The vanaras stand around them and weep. In Lanka, Sita is flown over the field to see.
>> enter garuda from right to 0.62 in 1.2 colour=true y=-120
>> prop n1 remove
>> prop n2 remove
>> prop cc remove
>> shake 5
>> sound wingBeat
Then a wind, and gold wings. Garuda, enemy of all serpents, drops out of the sky. The snakes are gone before he lands.
>> pose rama stand
>> pose lakshmana stand
>> scene camp clear
>> enter vibhishana from right to 0.66 in 0.1 colour=true
>> enter lakshmana:exile from left to 0.36 in 0.1 colour=true
>> enter rama:exile from left to 0.2 in 0.1 colour=true
VIBHISHANA: Today he has gone to the grove of Nikumbhila, to finish a fire rite. If he finishes it, he cannot be killed. If he is stopped before the fire takes the last offering, he can.
RAMA: Lakshmana. Go.
>> battle indrajit
-> END
