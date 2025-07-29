type TSystemPromptArgs = {
    conversation_id: string;
    relevant_context?: string;
    selected_file_ids?: string[];
    include_qr_tools?: boolean;
    custom_instructions?: string;
    summary?: string;
};

type TSystemPromptResponse = {
    system_content: string;
    token_count_estimate: number;
};

export const generate_system_prompt = ({
    conversation_id,
    relevant_context,
    selected_file_ids,
    include_qr_tools = true,
    custom_instructions,
    summary
}: TSystemPromptArgs): TSystemPromptResponse => {

    let system_content = `You are a helpful AI assistant`;

    // Add tool capabilities if enabled
    if (include_qr_tools) {
        system_content += ` with access to tools. You can:
          
**Generate QR codes** using generateQRCode tool to create QR codes for any data

Use generateQRCode when users ask about:
- Creating QR codes for websites, URLs, text, contact info, etc.
- "Generate QR code for..." or "Create QR code for..."
- Converting text/URLs to QR codes
- QR code generation in different formats (PNG, SVG, data URL)`;
    } else {
        system_content += `.`;
    }

    if (summary?.trim()) {
        system_content += `\n\n**SUMMARY OF THE CONVERSATION:**\n${summary}`;
    }

    // Add conversation context
    system_content += `\n\nCurrent conversation ID: ${conversation_id}`;

    // Add custom instructions if provided
    if (custom_instructions?.trim()) {
        system_content += `\n\n**CUSTOM INSTRUCTIONS:**\n${custom_instructions}`;
    }

    // Add document context if available
    if (relevant_context?.trim()) {
        const context_source = selected_file_ids && selected_file_ids.length > 0
            ? `from ${selected_file_ids.length} selected file(s)`
            : 'from uploaded documents';

        system_content += `\n\n**📚 DOCUMENT CONTEXT AVAILABLE:**

I have access to relevant information ${context_source} that may help answer your question. Here is the context:

---DOCUMENT CONTEXT START---
${relevant_context}
---DOCUMENT CONTEXT END---

**Instructions for using this context:**
- Use this information to provide accurate, detailed responses
- When referencing information from the documents, you can mention "Based on the uploaded documents..." or "According to the provided information..."
- If the user's question is directly answered by the context, prioritize that information
- If the context is not relevant to the user's question, you can ignore it and respond normally
- Combine the document context with your general knowledge when appropriate`;
    }

    // Estimate token count (rough approximation: 4 chars per token)
    const token_count_estimate = Math.ceil(system_content.length / 4);

    return {
        system_content,
        token_count_estimate
    };
};

export const generate_update_summary_prompt = (messages: string[], previous_summary?: string): string => {
    const UPDATE_SUMMARY_PROMPT = `You are an expert conversation analyst specializing in incremental summary updates. Your task is to intelligently merge new conversation content with an existing summary while maintaining accuracy and coherence.

## CRITICAL REQUIREMENTS:

### Integration Strategy:
- **Preserve Existing Information**: Keep all valid information from the previous summary
- **Merge Seamlessly**: Integrate new content without creating redundancy
- **Maintain Structure**: Follow the same organizational format as the original
- **Update Chronologically**: Ensure the flow remains chronological
- **Resolve Conflicts**: If new information contradicts old, note both with timestamps/context

### Content Handling:
- **Evolutionary Updates**: Show how topics, decisions, or technical details evolved
- **New Discoveries**: Highlight new topics, solutions, or insights clearly
- **Status Changes**: Update the status of pending items or unresolved questions
- **Contextual Awareness**: Understand how new messages relate to previous discussions

### Quality Assurance:
- Maintain the same concise yet comprehensive style
- Ensure no information loss from either source
- Keep technical details precise and complete
- Preserve all code, configurations, and specific technical information
- Update user preferences or constraints if they've changed

## INPUTS:

### PREVIOUS SUMMARY:
${previous_summary}

### NEW CONVERSATION CONTENT:
${messages.join("\n")}

## OUTPUT FORMAT:
Update the summary using this structure:

**Main Topics Discussed:**
- [Merge previous topics with new ones, noting evolution]
- [Add completely new topics clearly marked]

**Technical Details:**
- [Combine all technical information chronologically]
- [Note any updates, fixes, or changes to previous implementations]

**Decisions & Outcomes:**
- [Update previous decisions if they changed]
- [Add new decisions and their outcomes]
- [Note if previous solutions were modified or replaced]

**Pending Items:**
- [Update status of previous pending items]
- [Add new unresolved questions or tasks]
- [Remove items that were completed in new messages]

**Context Notes:**
- [Maintain user profile information]
- [Update project context if it evolved]
- [Note any new constraints or preferences]

## INTEGRATION GUIDELINES:
1. **If new content extends a topic**: Merge smoothly, showing progression
2. **If new content contradicts previous info**: Present both with context about when each was relevant
3. **If new content resolves pending items**: Move them to "Decisions & Outcomes" section
4. **If new content is completely unrelated**: Add as separate topics while maintaining flow

Generate an updated summary that represents the complete conversation history accurately and would enable seamless conversation continuation.`;

    return UPDATE_SUMMARY_PROMPT;
};

export const generate_initial_summary_prompt = (messages: string[]): string => {

    const INITIAL_SUMMARY_PROMPT = `You are an expert conversation analyst and summarization specialist. Your task is to create a comprehensive yet concise summary of a conversation that will serve as long-term memory for an AI assistant.

## CRITICAL REQUIREMENTS:

### Structure & Organization:
- Create a hierarchical summary with clear topic sections
- Use bullet points for key information within each topic
- Maintain strict chronological flow of discussion
- Separate facts from opinions/preferences clearly

### Content Preservation:
- **Code & Technical Details**: Preserve all code snippets, file names, error messages, and technical configurations exactly
- **Decisions & Outcomes**: Highlight all decisions made, solutions found, and their effectiveness
- **User Preferences**: Note user's stated preferences, constraints, and requirements
- **Context Continuity**: Include enough detail for seamless conversation resumption
- **Action Items**: Extract any pending tasks, follow-ups, or unresolved questions

### Quality Standards:
- Be comprehensive but concise (aim for 150-300 words)
- Use precise, unambiguous language
- Include specific details that matter (numbers, names, versions, dates)
- Avoid redundancy while ensuring completeness
- Write in third person, objective tone

## CONVERSATION TO SUMMARIZE:
${messages.join("\n")}

## OUTPUT FORMAT:
Structure your summary as:

**Main Topics Discussed:**
- Topic 1: [Brief description with key points]
- Topic 2: [Brief description with key points]

**Technical Details:**
- Code/configurations discussed
- Tools, libraries, or technologies mentioned
- Specific implementations or solutions

**Decisions & Outcomes:**
- What was decided or resolved
- Solutions that worked/didn't work
- User's final choices or preferences

**Pending Items:**
- Unresolved questions or issues
- Planned next steps or follow-ups
- Areas requiring further discussion

**Context Notes:**
- User's skill level, role, or background (if mentioned)
- Project context or constraints
- Important preferences or requirements

Generate a summary that would allow an AI assistant to seamlessly continue this conversation weeks later with full context.`;

    return INITIAL_SUMMARY_PROMPT;
}

export const generate_query_analysis_prompt = (query: string): string => {
    return `Analyze this user query to determine if it requires searching through uploaded documents/files.

User Query: "${query}"

Consider these factors:
- Does the query ask about specific information that might be in documents?
- Is it asking for explanations of concepts that could be in uploaded files?
- Does it reference specific data, code, or content that would be in files?
- Is it a general conversation or greeting that doesn't need file search?

Respond with:
1. needsSearch: true/false
2. confidence: 0.0-1.0
3. reason: brief explanation
4. optimizedQuery: if search is needed, provide a better search query

Format your response as JSON:
{
  "needsSearch": boolean,
  "confidence": number,
  "reason": "explanation",
  "optimizedQuery": "improved query for search"
}`;
};

export type { TSystemPromptArgs, TSystemPromptResponse }; 