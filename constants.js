export const SERVER_ENDPOINT = "127.0.0.1:4040";

export const EMPTY_GRAPH = {nodes: [], links: []};

export const EMPTY_ARRAY = [];

export const LLM_SYSTEM_PROMPT = [
    // system prompt
    {
        "role": "system",
        "content": "You are an expert in telling story based on graph (network) data.",
    },
]

export const LLM_FEW_SHOTS = [
    // Few-shot 1
    { 'role': 'user', 'content': `Rewrite the following narration of a comic frame based on "vispub-coauthor" data so that it would be engaging and informative. Your output must contain only the related information. You will be penalized if you start with "In the world of graph data" or similar things.
Here is my narration: "Before and after 2001, Thomas Ertl had expanded the network. Most of the relationships were newly added. Thomas Ertl had strengthened the relationship(s) with Simon Stegmaier, and Daniel Weiskopf."
`
    },
    { 'role': 'assistant', 'content': ` In the years surrounding 2001, we see a significant expansion in Thomas Ertl's professional network. Prior to this period, his connections were sparse, but post-2001, a flurry of new relationships emerge.

What's particularly noteworthy is the strengthening of ties between Thomas Ertl and two key colleagues: Simon Stegmaier and Daniel Weiskopf. This trio's collaboration becomes more robust over time, suggesting a fruitful and enduring partnership in their field. The graph data tells a story of growth, transformation, and deepening alliances in the world of academia.`
    },

    // Few-shot 2
    { 'role': 'user', 'content': `Rewrite the following narration of a comic frame based on "nation-trade" so that it would be engaging and informative. Your output must contain only the related information. You will be penalized if you start with "In the world of graph data" or similar things.
Here is my narration: "Before and after 1939, Poland had shrunk the network. Most of the relationships were preserved. Poland had lost the strong relationship(s) with Austria."
`
    },
    { 'role': 'assistant', 'content': `As we journey back to the years surrounding 1939, a striking shift unfolds in Poland's trade network. Prior to this time, Poland boasted an extensive web of connections. However, post-1939, we observe a contraction in Poland's commercial ties.

One of the most significant changes involves the severing of a once-strong relationship with Austria. This rupture signals a profound transformation in Poland's economic landscape, as previously established partnerships dissolve or weaken. Yet, despite these losses, much of Poland's network remains intact, hinting at resilience amidst adversity. The nation-trade graph data spins a tale of shifting alliances and challenges, offering valuable insights into the complex world of global commerce.`
    },
];