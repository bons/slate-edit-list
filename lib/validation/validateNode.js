// @flow
import { type Change, type Node } from 'slate';

import { isList } from '../utils';
import type Options from '../options';

type Normalizer = Change => any;

/**
 * Create a schema definition with rules to normalize lists
 */
function validateNode(opts: Options): Node => void | Normalizer {
    return node => joinAdjacentLists(opts, node);
}

/**
 * A rule that joins adjacent lists of the same type
 */
function joinAdjacentLists(opts: Options, node: Node): void | Normalizer {
    if (node.object !== 'document' && node.object !== 'block') {
        return undefined;
    }

    const invalids = node.nodes
        .map((child, i) => {
            if (!isList(opts, child)) return null;
            const next = node.nodes.get(i + 1);
            if (!next || !isList(opts, next) || !opts.canMerge(child, next)) {
                return null;
            }

            return [child, next];
        })
        .filter(Boolean);

    if (invalids.isEmpty()) {
        return undefined;
    }

    /**
     * Join the list pairs
     */
    // We join in reverse order, so that multiple lists folds onto the first one
    return change => {
        change.withoutNormalizing(() => {
            invalids.reverse().forEach(pair => {
                const [first, second] = pair;
                const updatedSecond = change.value.document.getDescendant(
                    second.key
                );
                updatedSecond.nodes.forEach((secondNode, index) => {
                    change.moveNodeByKey(
                        secondNode.key,
                        first.key,
                        first.nodes.size + index
                    );
                });

                change.removeNodeByKey(second.key);
            });
        });
    };
}

export default validateNode;
