// Ahalya — bala kanda
// Source: Valmiki, Bala Kanda, sargas 48-49 (verify)
// Migrated from the old script format. Not yet staged for the Ramlila stage.

>> scene hermitage
>> music calm
>> cast vishvamitra at 0.2
>> cast rama:prince at 0.34
>> cast lakshmana:prince at 0.27
>> cast ahalya:unseen at 0.7 pose=sit face=left mode=line
On the road to Mithila they pass a hermitage. The trees are in flower, but no one lives here.
RAMA: Whose place was this? It looks kept, and it looks empty.
VISHVAMITRA: The sage Gautama lived here with his wife, Ahalya. Indra came to her in her husband's shape.
VISHVAMITRA: Gautama cursed them both. She was to stay here for years beyond counting, unseen by any creature, living on air, until you came.
Rama looks, and where the others see nothing, he sees her.
>> play walkTo \{"who":"rama","to":0.6,"speed":130\}
>> pose rama bow
>> move lakshmana to 0.54 in 1.2
>> pose lakshmana bow
>> play hold \{"who":"ahalya","visual":"colour","time":2.6,"hint":"ahalya.6"\}
>> set ahalya stage=freed mode=colour alpha=1 pose=stand
>> sound bell
Colour comes into her from the ground up, like a lamp being lit.
>> pose rama stand
>> pose lakshmana stand
>> pose ahalya namaste
AHALYA: You are my guests. Sit. There is water, and fruit. It has been a long time since I gave anyone anything.
>> enter gautama from right to 0.84 in 1.6
Gautama, who has known this day would come, walks back out of the forest. He stands beside her.
>> wash
-> END
