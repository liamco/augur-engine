// collectFactionAbilities
// collectDetachmentAbilities
// collectEnhancementAbilities
// collectLeaderAbilities
// collectDefenderAbilities
// collectAttackerAbilities
// collectWeaponAttributes
//
// resolve each layer down onto it's immediate child layer, retaining signatures so we know where effects come from
// display final result in calculator
//
// COLLECT WEAPON ATTRIBUTES
// heavy - +1 hit if movement === HOLD
// assault - can shoot after advance
// precision - can target leaders through bodyguards
// sustained - extra auto hit on criticals
// lethal - auto wounds on criticals
// devastating - mortal wounds on criticals
// blast - +1 for every 5 models in target unit
// ignores cover - ignores benefitOfCover
// torrent - auto hit
//
// COLLECT ATTACKER/DEFENDER ATTRIBUTES
// lone operative - can only target if within 12"
// stealth - -1 to hit
// scouts - no effect on combat
// infiltrators - no effect on combat
// benefit-of-cover - +1 to save, up to a max of a 3+
// feel-no-pain - extra roll to cancel damage taken
