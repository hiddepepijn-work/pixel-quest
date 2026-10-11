// Schrijft source.json: de SideStore-bron voor de build die net gemaakt is. Eén keer toevoegen in SideStore
// (Sources → +) en elke nieuwe build verschijnt daar als Update.
//   RUN=<github run number> MESSAGE=<commit message> node sidestore-source.mjs <ipa>
import { statSync, writeFileSync } from 'node:fs'

const [ipa] = process.argv.slice(2)
const run = process.env.RUN ?? '0'
const note = (process.env.MESSAGE ?? '').split('\n')[0] || 'Nieuwe build.'
const repo = 'https://github.com/hiddepepijn-work/pixel-quest'

const source = {
  name: 'Pixel Quest',
  identifier: 'nl.hiddepepijn.pixelquest.source',
  subtitle: 'Samen taken, pets en jullie huis',
  apps: [
    {
      name: 'Pixel Quest',
      bundleIdentifier: 'nl.hiddepepijn.pixelquest',
      developerName: 'Hidde',
      subtitle: 'Samen taken, pets en jullie huis',
      localizedDescription: 'De taken-app van Hidde en Tessie: quests, pets, kleding en een huis dat meegroeit.',
      iconURL: 'https://raw.githubusercontent.com/hiddepepijn-work/pixel-quest/main/resources/icon.png',
      tintColor: 'F16446',
      versions: [
        {
          // Dezelfde nummers die de workflow in Info.plist zet.
          version: `0.1.${run}`,
          buildVersion: run,
          date: new Date().toISOString(),
          localizedDescription: note,
          downloadURL: `${repo}/releases/download/ios-latest/PixelQuest.ipa`,
          size: statSync(ipa).size,
          minOSVersion: '15.0'
        }
      ],
      appPermissions: { entitlements: [], privacy: {} }
    }
  ],
  news: []
}

writeFileSync('source.json', JSON.stringify(source, null, 2))
console.log(`source.json voor 0.1.${run}`)
