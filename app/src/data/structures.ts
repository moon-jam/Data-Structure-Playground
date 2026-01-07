export interface StructureDef {
  id: string;
  name: string;
  description: string;
  path: string;
  implemented: boolean;
}

export const structures: StructureDef[] = [
  {
    id: 'avl-tree',
    name: 'AVL Tree',
    description: 'A self-balancing binary search tree where the difference between heights of left and right subtrees cannot be more than one for all nodes.',
    path: '/avl-tree',
    implemented: true,
  },
  {
    id: 'bloom-filter',
    name: 'Bloom Filter',
    description: 'A space-efficient probabilistic data structure used to test whether an element is a member of a set.',
    path: '/bloom-filter',
    implemented: true,
  },
  {
    id: 'fibonacci-heap',
    name: 'Fibonacci Heap',
    description: 'A data structure for priority queue operations, consisting of a collection of heap-ordered trees.',
    path: '/fibonacci-heap',
    implemented: true,
  },
  {
    id: 'min-max-heap',
    name: 'Min-Max Heap',
    description: 'A complete binary tree that provides constant time access to both minimum and maximum elements.',
    path: '/min-max-heap',
    implemented: true,
  },
  {
    id: 'deap',
    name: 'DEAP',
    description: 'A double-ended heap structure that supports efficient insertion and deletion of both minimum and maximum elements.',
    path: '/deap',
    implemented: true,
  },
  {
    id: 'smmh',
    name: 'SMMH',
    description: 'Symmetric Min-Max Heap is a double-ended priority queue that maintains symmetric relationships between siblings.',
    path: '/smmh',
    implemented: true,
  },
  {
    id: 'b-tree',
    name: 'B-Tree',
    description: 'A self-balancing tree data structure that maintains sorted data and allows searches, sequential access, insertions, and deletions in logarithmic time.',
    path: '/b-tree',
    implemented: false,
  },
  {
    id: 'b-plus-tree',
    name: 'B+ Tree',
    description: 'An N-ary tree with a variable number of children per node, often used for database indexing.',
    path: '/b-plus-tree',
    implemented: false,
  },
  {
    id: 'red-black-tree',
    name: 'Red-Black Tree',
    description: 'A kind of self-balancing binary search tree where each node has an extra bit for denoting the color of the node, either red or black.',
    path: '/red-black-tree',
    implemented: false,
  },
  {
    id: 'trie',
    name: 'Trie',
    description: 'A type of search tree, a tree data structure used for locating specific keys from within a set.',
    path: '/trie',
    implemented: false,
  },
  {
    id: 'patricia-trie',
    name: 'Patricia Trie',
    description: 'A space-optimized variation of a trie.',
    path: '/patricia-trie',
    implemented: false,
  },
  {
    id: 'binomial-heap',
    name: 'Binomial Heap',
    description: 'A heap similar to a binary heap but also supports quick merging of two heaps.',
    path: '/binomial-heap',
    implemented: false,
  },
];
