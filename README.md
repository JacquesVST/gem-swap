# **Gem Swap** a game by _Jacques VST_

## How to play

Click and drag from one piece to an orthogonally adjacent pice on the grid to make a move, if the move is successful it will spend a move.

When there's a combination of 3 of the same piece in the same row or the same column it will make a match, the match can be made longer and the match size alongside with your attack and other attributes will result in damage to the enemy.

After you made some moves and your move counter reaches 0, it's the enemy's turn to attack and your moves will reload fully afterwards.

Advance the stages and floors to find stronger enemies and improve your build. Good Luck!

## Structure

The map structure of a given run will consist of x number of floors, y numbers of stages and z numbers of enemies. 

Upon defeating all enemies of a stage, your moves will be restored and you will be presented with navigation options, allowing you to choose the stage to go next.

The stages can be of different types, those being common enemies, mini boss enemies, item choice or shop. Of those, item and shop stages won't contain enemies and you will be able to acquire items to improve your build for the run, with the tradeoff that enemy battles might be more profitable depending on the situation.

If you got to the last stage, this will contain a few enemies followed by a boss which guards the next floor. Completing the stage the player will be offered a shop to restore some health or buy new items

The game ends if you defeated the last floor's boss, or your health reaches 0.

## Base Mechanics

- **Player:** The player isn't a character, but it has it's own stats that will be modified during the run. Such as:

    - **Attack:** base damage of each piece in a match.
    - **Defense:** negates incoming damage in a 1:1 ratio.
    - **Moves:** amount of swaps that can be done before the enemy's turn.

- **Swap:** You have the ability to swap any two orthogonally adjacent pieces at the cost of a move. Without the requirement to always make a match, you can move pieces to more optimal places to perform a more powerful move.

- **Stabilization:** After you move, and there are matches found in the grid, they will be removed opening space for the pieces directly above to fall. This is repeated until no more pieces can fall, and then the grid tries to generate new pieces on the top most row, if these generated pieces can fall, or the grid is full but one more match is identified, the loop repeats.

- **Combo:** When a match is found and the pieces are removed from the grid, a chain reaction can occur where a new match is formed by the new pieces spawning or falling to the new position. Two distinct matches in the same move or stabilization counts towards combo.

- **Critical:** Before each move, the board will apply to one or more random pieces, a critical effect. If one of the pieces in a match is a critical (or by chance), the final damage of the match will be increased by your critical damage stat.

- **Gold:** Dropped from enemies or from item effects. Used as currency in shops.

- **Items:** Items can provide an additional effect to the pieces or stat boosts for the player, they often stack and can be found multiple times. They can be obtained consistently through shop, item and mini boss stages, as a starter in the run and occasionally dropped from enemies.

- **Relics:** Relics are a rare drop from enemies, or offered as a reward for completing a mini boss stage. They generate with 3 random stat boosts of random values and, the closer these values are to 100% of the max potential of the relic, the higher will be it's power attribute.

- **Passives:** By default the player can choose a passive ability (also called a class). This ability provide huge advantage to a specific play style or simply modify stats. There are completion marks of each difficulty for each passive.

- **XP:** The player will accumulate xp during the battles. The amount is determined by the chosen difficulty and the enemy they defeated and can be used in the Upgrades page for increasing stats to help in future runs.

## Special Mechanics

- **Upgrades:** The accumulated xp the player has will be measured to determine the available upgrade points. These points can be spent on permanent stats, but also refunded in case you want to balance your build. Some stats cost more than others and have different limits.

- **Unique Items:** Items that do not stack with them selves and can only be acquired once.

- **Active Items:** Items that does not have an instant effect, but can be activated on demand by the player with a set cool down or number of uses.

- **Full Critical:** When in a match all the pieces matched where chosen as critical (critical chance has no effect), the damage will be multiplied instead by your critical damage to the power of your match length.

- **Rerolls:** Can be obtained through items and allow the recreation of the item, relic or shop prompt with most likely new options.

- **Reach:** The max distance in cells that a move can be valid, also apply to diagonal moves.

- **Timer:** The passive 'Think Fast' introduces a timer. This timer starts at 0 and, as matches are made it will gain time (longer matches giving more), but also constantly counts down. The timer is tied to a damage multiplier that is always applied to your matches and at certain time checkpoints will increase in value up to 4x. This timer resets every floor.

- **Grid Mutation:** Some items or passives can modify the grid configuration, such as adding extra rows or columns and removing a color from the run's color pool.

- **Custom Run:** Sandbox Mode, the modified values will stack with your upgrades and passives.
