// The Sanjeevani Mountain — yuddha kanda
// Source: Valmiki, Yuddha Kanda, sargas 74, 101 (verify) (later tradition)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene nightSky style=bharni-earth
>> music flight
North. Lanka, the sea, Kishkindha, Panchavati, Chitrakuta, the Ganga: the whole road back, in the time it takes to say it.
>> play mountainFlight \{"calm":true,"length":2600,"dir":1\}
>> scene mountain clear
>> prop peak herbPeak at 0.6 raw=true scale=1.3
>> enter hanuman from left to 0.3 in 1
The mountain of herbs. They shine at night. They also know when someone has come to pick them.
>> play tapSpots \{"hint":"sanjeevani.3","spots":\[\{"at":0.5,"y":120,"icon":"herb","vanish":true,"text":"sanjeevani.4"\},\{"at":0.62,"y":220,"icon":"herb","vanish":true,"text":"sanjeevani.5"\},\{"at":0.72,"y":100,"icon":"herb","vanish":true,"text":"sanjeevani.6"\}\]\}
HANUMAN: Then I will not choose. Sushena can choose.
>> move hanuman to 0.6 in 0.8
>> pose hanuman carry
>> play hold \{"visual":"lift","prop":"peak","height":190,"time":2.6,"hint":"sanjeevani.8"\}
>> shake 8
>> sound thunder
>> prop peak remove
>> scene nightSky clear
>> play mountainFlight \{"carry":true,"time":48,"dir":1\}
>> scene tamasa clear
>> music grief
>> prop peak herbPeak at 0.2 raw=true scale=0.8
>> enter sushena from right to 0.66 in 0.1
>> set sushena face=-1 pose=give
>> enter lakshmana:exile from left to 0.54 in 0.1
>> set lakshmana pose=dead rot=1.45 y=-40
>> enter rama:exile from left to 0.42 in 0.1
>> set rama pose=kneel
Sushena crushes a leaf and holds it under Lakshmana's nose.
>> set lakshmana pose=stand rot=0 y=0
>> sound bell
>> music home
He sits up, looks around at all the faces, and asks whether Ravana is dead yet.
>> pose rama stand
>> move rama to 0.48 in 0.6
>> pose rama give
RAMA: If you had not come back, I would not have wanted Sita, or victory, or my life.
>> wash
-> END
