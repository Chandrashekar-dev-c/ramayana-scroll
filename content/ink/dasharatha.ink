// The Death of Dasharatha — ayodhya kanda
// Source: Valmiki, Ayodhya Kanda, sargas 57-64 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene kingRoom
>> music grief
>> cast dasharatha at 0.36 pose=sit y=-30
>> cast kaushalya at 0.52 face=left
>> prop bed bed at 0.36
Sumantra comes back with an empty chariot. The king asks one question: did he turn round? He did not.
DASHARATHA: Kaushalya. Are you there? I cannot see you. Let me tell you why this is happening. I have never told anyone.
>> scene tamasa clear
>> set dasharatha visible=false
>> enter young:prince from left to 0.3 in 0.1 as=rama mode=line
>> set young pose=draw1
I was young, and proud that I could shoot by sound alone. One night in the rains I went to the river to hunt.
>> enter youngAscetic from right to 0.74 in 1.2 mode=line
>> pose youngAscetic kneel
I heard water gurgle, like an elephant drinking. I loosed at the sound.
>> pose young shoot
>> sound release
>> wait 0.6
>> pose youngAscetic grieve
It was a boy, filling a pitcher for his mother and father, who were old and blind and thirsty.
>> enter blindFather from right to 0.84 in 1.4 nowait mode=line
>> enter blindMother from right to 0.92 in 1.6 mode=line
I carried the water to them myself and told them what I had done.
BLINDFATHER: You did not know, so you will live. But you will die as I am dying now: calling for your son.
>> scene kingRoom clear
>> prop bed bed at 0.36
>> set dasharatha visible=true at=0.36
>> enter kaushalya from right to 0.52 in 0.1
DASHARATHA: Take my hand. I cannot feel it.
>> play hold \{"visual":"lamps","count":7,"time":12,"hint":"dasharatha.9","noMeter":true,"cue":"bellSoft","texts":\["dasharatha.10","dasharatha.11","dasharatha.12","dasharatha.13"\]\}
>> pose dasharatha grieve
>> music silence
At dawn the singers come to wake the king, and he does not wake.
Riders go north, to bring Bharata home from his uncle's kingdom. They are told to say nothing.
>> sound bell
>> wait 1.6
-> END
