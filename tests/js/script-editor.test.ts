// Lógica pura del editor de guion (diff de versiones y auto-formato). Uso: npm run test:js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diffBlocks, diffSummary } from '../../resources/js/features/script/lib/diffBlocks.ts';
import { matchCharacterLine, NEXT_KIND } from '../../resources/js/features/script/lib/scriptFormat.ts';

const block = (id: string, text: string, kind = 'action') => ({ id, kind: kind as 'action', text });

test('marca bloques añadidos, eliminados y modificados', () => {
    const before = [block('a', 'EXT. REFUGIO', 'heading'), block('b', 'Nieve.'), block('c', 'Viento.')];
    const after = [block('a', 'EXT. REFUGIO', 'heading'), block('b', 'Mucha nieve.'), block('d', 'Silencio.')];

    const diff = diffBlocks(before, after);

    assert.deepEqual(
        diff.map((item) => item.change),
        ['same', 'modified', 'added', 'removed'],
    );
    assert.equal(diff[1].before?.text, 'Nieve.');
    assert.equal(diff[1].after?.text, 'Mucha nieve.');
    assert.deepEqual(diffSummary(diff), { added: 1, removed: 1, modified: 1, moved: 0 });
});

test('un cambio de tipo es una modificación', () => {
    const diff = diffBlocks([block('a', 'IRENE')], [block('a', 'IRENE', 'character')]);

    assert.equal(diff[0].change, 'modified');
});

test('un bloque reordenado aparece una sola vez, como movido', () => {
    const before = [block('a', '1'), block('b', '2'), block('c', '3')];
    const after = [block('c', '3'), block('a', '1'), block('b', '2 bis')];

    const diff = diffBlocks(before, after);

    assert.equal(diff.length, 3);
    assert.deepEqual(diffSummary(diff), { added: 0, removed: 0, modified: 1, moved: 1 });
    assert.equal(diff.find((item) => item.change === 'moved')?.after?.text, '3');
});

test('versiones idénticas o vacías no tienen cambios', () => {
    const blocks = [block('a', 'Uno'), block('b', 'Dos')];

    assert.deepEqual(diffSummary(diffBlocks(blocks, blocks)), { added: 0, removed: 0, modified: 0, moved: 0 });
    assert.deepEqual(diffBlocks([], []), []);
    assert.deepEqual(diffSummary(diffBlocks([], blocks)), { added: 2, removed: 0, modified: 0, moved: 0 });
    assert.deepEqual(diffSummary(diffBlocks(blocks, [])), { added: 0, removed: 2, modified: 0, moved: 0 });
});

test('Enter tras PERSONAJE crea diálogo y sigue la convención de guion', () => {
    assert.equal(NEXT_KIND.character, 'dialogue');
    assert.equal(NEXT_KIND.dialogue, 'action');
    assert.equal(NEXT_KIND.heading, 'action');
    assert.equal(NEXT_KIND.parenthetical, 'dialogue');
});

test('una línea en mayúsculas con el nombre de un personaje de la escena se reconoce', () => {
    const names = ['Irene Vallejo', 'Tomás Arce'];

    assert.equal(matchCharacterLine('IRENE VALLEJO', names), 'Irene Vallejo');
    assert.equal(matchCharacterLine('  TOMÁS ', names), 'Tomás Arce');
    assert.equal(matchCharacterLine('Irene', names), null);
    assert.equal(matchCharacterLine('MARCOS', names), null);
    assert.equal(matchCharacterLine('IRENE\nTOMÁS', names), null);
    assert.equal(matchCharacterLine('', names), null);
    assert.equal(matchCharacterLine('123', ['123']), null);
});
