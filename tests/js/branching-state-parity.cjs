// Comprueba que el espejo JS del evaluador (branching-state.blade.php) da los mismos resultados que
// BranchingStateEvaluator con los casos de tests/Fixtures/branching-state-cases.json. Uso: npm run test:parity
const fs = require('fs');
const vm = require('vm');
const [, , partialPath, casesPath] = process.argv;

const source = fs.readFileSync(partialPath, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const context = {};
vm.createContext(context);
vm.runInContext(source + '\nthis.BranchingState = BranchingState;', context);
const BS = context.BranchingState;

const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
let failed = 0;
for (const c of cases) {
    const state = BS.apply(c.effects, BS.initialState(c.variables));
    const available = BS.isAvailable(c.condition, state);
    const ok = JSON.stringify(sortKeys(state)) === JSON.stringify(sortKeys(c.state)) && available === c.available;
    if (!ok) {
        failed++;
        console.log('FAIL', c.name, JSON.stringify(state), available);
    }
}
console.log(cases.length - failed + '/' + cases.length + ' JS cases OK');
process.exit(failed ? 1 : 0);

function sortKeys(obj) {
    return Object.keys(obj).sort().reduce((acc, key) => ((acc[key] = obj[key]), acc), {});
}
