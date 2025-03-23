'use client'

import React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	Editor,
	Transforms,
	createEditor,
	Range,
	type Descendant,
	Element as SlateElement,
	type Node as SlateNode,
	type NodeEntry,
	Text,
	Path,
} from 'slate'
import { withHistory } from 'slate-history'
import {
	Editable,
	ReactEditor,
	type RenderElementProps,
	type RenderLeafProps,
	Slate,
	useFocused,
	useSelected,
	withReact,
} from 'slate-react'
import { useParams } from 'next/navigation'
import type { BaseEditor } from 'slate'

import { cn } from '@/lib/utils'
import type { MentionType } from './types'
import { getCachedData } from '@/lib/cache'
import type { GuildData, RawChannel } from '@/types/guild'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import {
	Command,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandInput,
} from '@/components/ui/command'

// Extend the Range type to include our custom properties
declare module 'slate' {
	interface BaseRange {
		bold?: boolean
		italic?: boolean
		code?: boolean
		text?: string
		// Add other styling properties as needed
		title?: boolean
		list?: boolean
		hr?: boolean
		blockquote?: boolean
		url?: boolean
		keyword?: boolean
		punctuation?: boolean
		strikethrough?: boolean
		underline?: boolean
		spoiler?: boolean
	}

	// Define custom element types for the editor
	interface CustomTypes {
		Editor: BaseEditor & ReactEditor
		Element:
			| ParagraphElement
			| StarWarsMentionElement
			| MentionPlaceholderElement
			| SpoilerElement
		Text: CustomText
	}
}

// Define a CustomText interface with formatting properties
interface CustomText {
	text: string
	bold?: boolean
	italic?: boolean
	code?: boolean
	underline?: boolean
	strikethrough?: boolean
	spoiler?: boolean
	// Prism markdown token types
	title?: boolean
	list?: boolean
	hr?: boolean
	blockquote?: boolean
	url?: boolean
	keyword?: boolean
	punctuation?: boolean
}

// Basic paragraph element
interface ParagraphElement {
	type: 'paragraph'
	children: Array<CustomText | StarWarsMentionElement | SpoilerElement>
}

// MentionPlaceholderElement structure
interface MentionPlaceholderElement {
	type: 'mention-placeholder'
	mentionType: MentionType
	children: [{ text: '' }]
}

// Add a Spoiler element interface
interface SpoilerElement {
	type: 'spoiler'
	children: [{ text: string }]
}

// StarWars character mention element structure
interface StarWarsMentionElement {
	type: 'mention'
	mentionType: MentionType
	value: string
	displayValue: string
	needsUpdate?: boolean // Flag to indicate if this mention needs display value update
	children: [{ text: '' }]
}

type RenderElementPropsFor<T extends SlateElement> = RenderElementProps & {
	element: T
}

// Define a custom editor type for this test component
interface TestCustomEditor extends ReactEditor {
	isInline: (element: SlateElement) => boolean
	isVoid: (element: SlateElement) => boolean
	markableVoid: (element: SlateElement) => boolean
	normalizeNode: (entry: NodeEntry) => void
	insertText: (text: string) => void
}

// Define props interface for the component
interface TestMentionTextareaProps {
	name?: string
	value?: string
	onChange?: (value: string) => void
	placeholder?: string
	className?: string
	disabled?: boolean
	rows?: number
	maxLength?: number
	id?: string
}

// Update the RenderLeafProps interface to use our CustomText type
type CustomRenderLeafProps = Omit<RenderLeafProps, 'leaf'> & {
	leaf: CustomText
}

const TestMentionTextarea = ({
	name,
	value = '',
	onChange,
	placeholder = "Type '@' to mention someone...",
	className,
	disabled = false,
	rows = 3,
	maxLength,
	id,
}: TestMentionTextareaProps) => {
	const params = useParams()
	const guildId = params.id as string

	// Helper function to process mention elements
	const processMentionElement = useCallback(
		(element: HTMLElement, paragraph: ParagraphElement) => {
			const value = element.getAttribute('data-value') || ''
			const mentionType =
				(element.getAttribute('data-mention-type') as MentionType) || 'variable'
			const displayValue =
				element.getAttribute('data-display') || element.textContent || value
			const needsUpdate = element.getAttribute('data-needs-update') === 'true'

			console.log(
				`Creating mention element: type=${mentionType}, value=${value}, display=${displayValue}`
			)

			paragraph.children.push({
				type: 'mention',
				mentionType,
				value,
				displayValue,
				needsUpdate: needsUpdate,
				children: [{ text: '' }],
			})
		},
		[]
	)

	// Helper function to process DOM nodes into Slate nodes
	const processNode = useCallback(
		(node: Node, paragraph: ParagraphElement) => {
			if (node.nodeType === Node.TEXT_NODE) {
				const text = node.textContent || ''
				if (text.trim() || text) {
					paragraph.children.push({ text })
				}
				return
			}

			if (node.nodeType === Node.ELEMENT_NODE) {
				const element = node as HTMLElement

				if (
					element.tagName === 'SPAN' &&
					element.getAttribute('data-type') === 'mention'
				) {
					processMentionElement(element, paragraph)
					return
				}

				if (
					element.tagName === 'SPAN' &&
					element.getAttribute('data-type') === 'spoiler'
				) {
					const value = element.getAttribute('data-value') || ''
					paragraph.children.push({
						type: 'spoiler',
						children: [{ text: value }],
					})
					return
				}

				if (element.tagName === 'STRONG') {
					paragraph.children.push({
						text: element.textContent || '',
						bold: true,
					})
					return
				}

				if (element.tagName === 'S') {
					paragraph.children.push({
						text: element.textContent || '',
						strikethrough: true,
					})
					return
				}

				if (element.tagName === 'U') {
					paragraph.children.push({
						text: element.textContent || '',
						underline: true,
					})
					return
				}

				// Process child nodes for other elements
				for (const childNode of element.childNodes) {
					processNode(childNode, paragraph)
				}
			}
		},
		[processMentionElement]
	)

	// Helper function to process a single line into a Slate paragraph node
	const processLineToSlateNode = useCallback(
		(line: string): Descendant => {
			// Process mentions like {variable}, @role, #channel, and <#ID> Discord mentions
			const processedValue = line.replace(
				/(\{([^}]+)\}|@([^\s]+)|<#(\d+)>|#([^\s<>]+))/g,
				(match, full, variable, role, channelId, channel) => {
					if (variable) {
						// Handle variables in {var} format
						return `<span data-type="mention" data-mention-type="variable" data-value="${variable}">${variable}</span>`
					}

					if (role) {
						// 	Handle roles with @
						return `<span data-type="mention" data-mention-type="role" data-value="${role}">${role}</span>`
					}
					if (channelId) {
						// Handle Discord channel mention format <#ID>
						// Set the display value to the ID initially, it will be updated after channels are loaded
						console.log(`Parsing channel with ID: ${channelId}`)
						return `<span data-type="mention" data-mention-type="channel" data-value="${channelId}" data-needs-update="true">${channelId}</span>`
					}
					if (channel) {
						// Handle plain channel mentions with #
						console.log(`Parsing channel with name: ${channel}`)
						return `<span data-type="mention" data-mention-type="channel" data-value="${channel}" data-display="${channel}">${channel}</span>`
					}
					return match
				}
			)

			// Process markdown-style formatting
			const markdownProcessed = processedValue.replace(
				/(\*\*([^*]+)\*\*|~~([^~]+)~~|__([^_]+)__|\|\|([^|]+)\|\|)/g,
				(match, full, bold, strike, underline, spoiler) => {
					if (bold) {
						return `<strong>${bold}</strong>`
					}
					if (strike) {
						return `<s>${strike}</s>`
					}
					if (underline) {
						return `<u>${underline}</u>`
					}
					if (spoiler) {
						return `<span data-type="spoiler" data-value="${spoiler}">${spoiler}</span>`
					}
					return match
				}
			)

			// Create a DOM parser to handle the HTML
			const parser = new DOMParser()
			const doc = parser.parseFromString(
				`<div>${markdownProcessed}</div>`,
				'text/html'
			)
			const rootNode = doc.body.firstChild

			// Final paragraph to process the current line
			const paragraph: ParagraphElement = {
				type: 'paragraph',
				children: [],
			}

			// Process all child nodes
			if (rootNode) {
				for (const node of rootNode.childNodes) {
					processNode(node, paragraph)
				}
			}

			// If line is empty, return empty paragraph
			if (paragraph.children.length === 0 && line === '') {
				return {
					type: 'paragraph' as const,
					children: [{ text: '' }],
				} as Descendant
			}

			return paragraph as Descendant
		},
		[processNode]
	)

	// Helper function to parse input value into Slate format
	const parseInputValue = useCallback(
		(input: string): Descendant[] => {
			if (!input) {
				return [
					{
						type: 'paragraph' as const,
						children: [{ text: '' }],
					},
				] as Descendant[]
			}

			try {
				console.log('Received value to parse:', input)

				// If value is empty string, set empty paragraph
				if (input === '') {
					return [
						{
							type: 'paragraph' as const,
							children: [{ text: '' }],
						},
					] as Descendant[]
				}

				// Create a more robust parsing of the input value
				let paragraphs: Descendant[] = []

				// Split the content by newlines to create proper paragraphs
				const lines = input.split('\n')

				for (const line of lines) {
					// Process the line and create a paragraph node
					const paragraph = processLineToSlateNode(line)
					paragraphs.push(paragraph)
				}

				// If no paragraphs, create a default one
				if (paragraphs.length === 0) {
					paragraphs = [
						{
							type: 'paragraph' as const,
							children: [{ text: input }],
						},
					] as Descendant[]
				}

				return paragraphs
			} catch (err) {
				console.error('Error parsing input value:', err)
				// Fallback to simple text if parsing fails
				return [
					{
						type: 'paragraph' as const,
						children: [{ text: input }],
					},
				] as Descendant[]
			}
		},
		[processLineToSlateNode]
	)

	// Use a ref to track if we've already updated the initial value
	const initialValueProcessedRef = useRef(false)

	// Create a more robust initialValue using useMemo
	const initialValue = useMemo(() => {
		// Reset the processed flag when value changes
		initialValueProcessedRef.current = false
		console.log(
			'Resetting initialValueProcessed flag and parsing value:',
			value
		)
		return parseInputValue(value)
	}, [value, parseInputValue])

	// Store internal state for Slate
	const [internalValue, setInternalValue] = useState<Descendant[]>(initialValue)
	const [charCount, setCharCount] = useState(0)

	// Use the same structure as in mention-textarea.tsx
	const [mentionPopover, setMentionPopover] = useState<{
		type: MentionType
		search: string
		anchor: { x: number; y: number } | null
	} | null>(null)

	// Add state for roles
	const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([])
	const [channels, setChannels] = useState<RawChannel[]>([])

	// Load guild data from cache
	useEffect(() => {
		try {
			const cacheKey = `guild-${guildId}`
			const cached = getCachedData<GuildData>(cacheKey)

			if (cached?.data) {
				setRoles(cached.data.roles || [])
				// Filter out category channels (type 4 is GUILD_CATEGORY)
				const nonCategoryChannels = (cached.data.channels || []).filter(
					(channel) => typeof channel.type === 'number' && channel.type !== 4
				)
				setChannels(nonCategoryChannels)
				// Reset the ref when new data is loaded
				initialValueProcessedRef.current = false
			} else {
				console.log('No cached guild data found')
			}
		} catch (err) {
			console.error('Failed to load guild data from cache:', err)
		}
	}, [guildId])

	// Helper function to create a map of channel IDs to names
	const createChannelMap = useCallback(
		(channels: RawChannel[]): Record<string, string> => {
			const channelMap: Record<string, string> = {}
			for (const channel of channels) {
				if (channel.id && channel.name) {
					channelMap[channel.id] = channel.name
				}
			}
			return channelMap
		},
		[]
	)

	// Helper function to create a map of role IDs to names
	const createRoleMap = useCallback(
		(roles: Array<{ id: string; name: string }>): Record<string, string> => {
			const roleMap: Record<string, string> = {}
			for (const role of roles) {
				roleMap[role.id] = role.name
			}
			return roleMap
		},
		[]
	)

	// Helper function to check if a channel display value needs to be updated
	const updateChannelDisplayValue = useCallback(
		(
			channelId: string,
			currentDisplayValue: string,
			channelMap: Record<string, string>
		): { needsUpdate: boolean; newDisplayValue: string } => {
			const channelName = channelMap[channelId]
			if (channelName && channelName !== currentDisplayValue) {
				return { needsUpdate: true, newDisplayValue: channelName }
			}
			return { needsUpdate: false, newDisplayValue: currentDisplayValue }
		},
		[]
	)

	// Function to update channel mentions in DOM directly
	const updateDOMChannelMentions = useCallback(
		(channelMap: Record<string, string>) => {
			// Make sure to run this after React has finished rendering
			setTimeout(() => {
				if (!editorContainerRef.current) {
					console.log('Editor container ref not available')
					return
				}

				// Find all channel mention elements in the DOM
				const mentionElements = editorContainerRef.current.querySelectorAll(
					'[data-mention-type="channel"]'
				)

				console.log(
					`Found ${mentionElements.length} channel mention elements in DOM`
				)

				let updatesCount = 0

				// Update each mention element
				for (const element of mentionElements) {
					// Get the channel ID from the data-value attribute
					const channelId = element.getAttribute('data-value')

					if (!channelId) {
						console.log(
							'Channel mention element missing data-value attribute',
							element
						)
						return
					}

					// Look up the channel name
					const channelName = channelMap[channelId]

					if (!channelName) {
						console.log(`No channel name found for ID: ${channelId}`)
						return
					}

					// Check if the text content needs to be updated
					const displayText = `#${channelName}`

					if (element.textContent !== displayText) {
						console.log(
							`Updating DOM element for channel ${channelId}: "${element.textContent}" → "${displayText}"`
						)
						element.textContent = displayText
						updatesCount++
					}
				}

				if (updatesCount > 0) {
					console.log(`Updated ${updatesCount} channel mentions in the DOM`)
				} else {
					console.log('No DOM updates needed for channel mentions')
				}
			}, 100) // Small delay to ensure React has finished rendering
		},
		[]
	)

	// Function to update mentions in a Slate value
	const updateMentionsInValue = useCallback(
		(value: Descendant[]) => {
			console.log('Running updateMentionsInValue', {
				channelsCount: channels?.length,
				rolesCount: roles?.length,
			})

			let hasChanges = false

			// Create maps for quick lookup
			const channelMap =
				channels?.reduce(
					(acc, channel) => {
						acc[channel.id] = channel.name
						return acc
					},
					{} as Record<string, string>
				) || {}

			const roleMap =
				roles?.reduce(
					(acc, role) => {
						acc[role.id] = role.name
						return acc
					},
					{} as Record<string, string>
				) || {}

			// Log sample of channel map for debugging
			console.log('Channel map sample:', Object.entries(channelMap).slice(0, 3))

			// Traversal function to update mention display values
			const updateMentionsRecursive = (nodes: Descendant[]): Descendant[] => {
				return nodes.map((node) => {
					if (!Editor.isEditor(node) && SlateElement.isElement(node)) {
						if (node.type === 'mention' && 'mentionType' in node) {
							// Handle channel mentions
							if (node.mentionType === 'channel' && channelMap) {
								const channelId = node.value
								const channelName = channelMap[channelId] || 'NOT FOUND'

								console.log(
									`Checking channel mention: ID=${channelId}, current display=${node.displayValue}, mapped name=${channelName}`
								)

								// Only update if the display value is different
								if (
									node.displayValue !== channelName &&
									channelName !== 'NOT FOUND'
								) {
									console.log(
										`→ Updating channel display from "${node.displayValue}" to "${channelName}"`
									)
									hasChanges = true
									return {
										...node,
										displayValue: channelName,
									} as StarWarsMentionElement
								}
							}
							// Handle role mentions
							else if (node.mentionType === 'role' && roleMap) {
								const roleId = node.value
								const roleName = roleMap[roleId] || 'NOT FOUND'

								console.log(
									`Checking role mention: ID=${roleId}, current display=${node.displayValue}, mapped name=${roleName}`
								)

								// Only update if the display value is different
								if (
									node.displayValue !== roleName &&
									roleName !== 'NOT FOUND'
								) {
									console.log(
										`→ Updating role display from "${node.displayValue}" to "${roleName}"`
									)
									hasChanges = true
									return {
										...node,
										displayValue: roleName,
									} as StarWarsMentionElement
								}
							}
						}

						// Recursively check children if it's an element with children
						if ('children' in node) {
							const newChildren = updateMentionsRecursive(node.children)
							return { ...node, children: newChildren } as Descendant
						}
					}
					return node
				}) as Descendant[]
			}

			const updatedValue = updateMentionsRecursive(value)
			console.log(`updateMentionsInValue completed, hasChanges: ${hasChanges}`)

			return {
				updatedValue,
				hasChanges,
			}
		},
		[channels, roles]
	)

	// Function to update channel mentions in both state and DOM
	const updateAllChannelMentions = useCallback(() => {
		if (!channels || channels.length === 0) return

		console.log(`Updating channel mentions with ${channels.length} channels`)

		// Create channel map for quick lookup
		const channelMap = createChannelMap(channels)

		// First, log the current state before updates
		console.log('Channel mentions before update:')
		for (const node of internalValue) {
			if (SlateElement.isElement(node) && node.type === 'paragraph') {
				for (const child of node.children) {
					if (
						SlateElement.isElement(child) &&
						child.type === 'mention' &&
						child.mentionType === 'channel'
					) {
						console.log(
							`Channel ID: ${child.value}, Display: ${child.displayValue}`
						)
					}
				}
			}
		}

		// Update internal state by making a deep copy
		const updatedValue = JSON.parse(JSON.stringify(internalValue))

		// Use the general updateMentionsInValue function
		const { updatedValue: updatedInternalValue, hasChanges } =
			updateMentionsInValue(updatedValue)

		if (hasChanges) {
			console.log('Channel mentions updated in internal state')
			setInternalValue(updatedInternalValue)

			// Log the changes that were made
			console.log('Channel mentions after update:')
			for (const node of updatedInternalValue) {
				if (SlateElement.isElement(node) && node.type === 'paragraph') {
					for (const child of node.children) {
						if (
							SlateElement.isElement(child) &&
							child.type === 'mention' &&
							child.mentionType === 'channel'
						) {
							console.log(
								`Channel ID: ${child.value}, Display: ${child.displayValue}`
							)
						}
					}
				}
			}
		} else {
			console.log('No channel mention changes needed')
		}

		// Also update DOM directly
		updateDOMChannelMentions(channelMap)
	}, [
		channels,
		internalValue,
		updateMentionsInValue,
		createChannelMap,
		updateDOMChannelMentions,
	])

	// Use the updateAllChannelMentions function in your useEffect
	useEffect(() => {
		if (channels && channels.length > 0) {
			// Small delay to ensure the DOM has updated
			setTimeout(() => {
				console.log(
					'Calling updateAllChannelMentions with delay after channels loaded'
				)
				updateAllChannelMentions()
			}, 100)
		}
	}, [channels, updateAllChannelMentions])

	// Update initial value when channels and roles are loaded
	useEffect(() => {
		if (
			channels?.length > 0 &&
			roles?.length > 0 &&
			value &&
			internalValue &&
			!initialValueProcessedRef.current
		) {
			console.log('Updating initial value with loaded channel and role data')

			// Don't re-parse the value, just update the existing internalValue
			const { updatedValue, hasChanges } = updateMentionsInValue(internalValue)

			if (hasChanges) {
				console.log('Initial value updated with channel and role names')
				setInternalValue(updatedValue)
			} else {
				console.log('No changes needed to initial value')
			}

			initialValueProcessedRef.current = true
		}
	}, [channels, roles, value, internalValue, updateMentionsInValue])

	// Add a ref for the editor container
	const editorContainerRef = useRef<HTMLDivElement>(null)

	const renderElement = useCallback(
		(props: RenderElementProps) => <Element {...props} />,
		[]
	)
	const renderLeaf = useCallback(
		(props: CustomRenderLeafProps) => <Leaf {...props} />,
		[]
	)
	const editor = useMemo(
		() =>
			withMentions(withReact(withHistory(createEditor()))) as TestCustomEditor,
		[]
	)

	// Import a utility to escape regex special characters
	function escapeRegExp(string: string) {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
	}

	// Add Markdown syntax highlighting using Prism
	const decorate = useCallback(([node, path]: NodeEntry) => {
		// Return empty array - not using decorate as it doesn't work properly
		return []
	}, [])

	// Helper function to serialize Slate data to plaintext
	const serializeToPlaintext = useCallback((nodes: Descendant[]): string => {
		return nodes
			.map((n) => {
				if (SlateElement.isElement(n)) {
					if (n.type === 'mention' && 'value' in n) {
						if (n.mentionType === 'role') {
							return `@${n.displayValue}`
						}
						if (n.mentionType === 'channel') {
							console.log(
								`Serializing channel mention: ID=${n.value}, display=${n.displayValue}`
							)
							return `<#${n.value}>`
						}
						return `@${n.value}`
					}
					// Handle spoiler elements
					if (
						n.type === 'spoiler' &&
						n.children &&
						n.children[0] &&
						typeof n.children[0].text === 'string'
					) {
						return `||${n.children[0].text}||`
					}
				}
				if ('children' in n) {
					// Process each child node in the paragraph
					let paragraphText = ''
					for (const child of n.children) {
						if (SlateElement.isElement(child)) {
							if (
								child.type === 'spoiler' &&
								child.children &&
								child.children[0] &&
								typeof child.children[0].text === 'string'
							) {
								paragraphText += `||${child.children[0].text}||`
								continue
							}
							if (child.type === 'mention' && 'value' in child) {
								if (child.mentionType === 'role') {
									paragraphText += `@${child.displayValue}`
								} else if (child.mentionType === 'channel') {
									console.log(
										`Serializing nested channel mention: ID=${child.value}, display=${child.displayValue}`
									)
									paragraphText += `<#${child.value}>`
								} else {
									paragraphText += `@${child.value}`
								}
								continue
							}
						}

						if (!('text' in child)) continue

						// Handle text nodes with formatting
						const text = child.text || ''
						const textNode = child as CustomText
						if (textNode.bold) {
							paragraphText += `**${text}**`
						} else if (textNode.strikethrough) {
							paragraphText += `~~${text}~~`
						} else if (textNode.underline) {
							paragraphText += `__${text}__`
						} else {
							paragraphText += text
						}
					}
					return paragraphText
				}
				return ''
			})
			.join('\n')
	}, [])

	// Handle serializing to HTML and triggering onChange
	const handleSlateChange = useCallback(
		(newValue: Descendant[]) => {
			// Update channel display values if needed
			let valueToUse = newValue

			if (channels.length > 0) {
				// Create a mapping of channel IDs to names for quick lookup
				const channelMap = createChannelMap(channels)
				console.log(
					'Channel map in handleSlateChange:',
					Array.from(Object.entries(channelMap)).slice(0, 5)
				)

				// Check if any channel mentions need to be updated
				let hasUpdates = false
				const updatedValue = newValue.map((node) => {
					if (SlateElement.isElement(node) && node.type === 'paragraph') {
						// Check if any children nodes need to be updated
						const updatedChildren = node.children.map((child) => {
							if (
								SlateElement.isElement(child) &&
								child.type === 'mention' &&
								child.mentionType === 'channel'
							) {
								// Get the channel name from our map if available
								const { needsUpdate, newDisplayValue } =
									updateChannelDisplayValue(
										child.value,
										child.displayValue || child.value,
										channelMap
									)

								if (needsUpdate) {
									console.log(
										`Updating channel in handleSlateChange: ${child.value} => ${newDisplayValue}`
									)
									hasUpdates = true
									return {
										...child,
										displayValue: newDisplayValue,
										needsUpdate: false, // Reset the flag
									}
								}
							}
							return child
						})

						// Only create a new node if changes were made
						if (
							updatedChildren.some((child, i) => child !== node.children[i])
						) {
							return { ...node, children: updatedChildren }
						}
					}
					return node
				})

				// Only use the updated value if changes were made
				if (hasUpdates) {
					console.log(
						'Updating channel mention display values in handleSlateChange'
					)
					valueToUse = updatedValue
				}
			}

			setInternalValue(valueToUse)

			// Serialize to plain text with markdown-style formatting
			if (onChange) {
				const serialized = serializeToPlaintext(valueToUse)

				// Update character count
				setCharCount(serialized.length)

				onChange(serialized)
			}
		},
		[
			onChange,
			channels,
			createChannelMap,
			updateChannelDisplayValue,
			serializeToPlaintext,
		]
	)

	// Filter roles based on search
	const filteredRoles = useMemo(() => {
		if (!mentionPopover || mentionPopover.type !== 'role') {
			return []
		}

		return roles.filter((role) =>
			role.name.toLowerCase().includes(mentionPopover.search.toLowerCase())
		)
	}, [roles, mentionPopover])

	// Filter channels based on search
	const filteredChannels = useMemo(() => {
		if (!mentionPopover || mentionPopover.type !== 'channel') {
			return []
		}

		return channels.filter((channel) =>
			channel.name.toLowerCase().includes(mentionPopover.search.toLowerCase())
		)
	}, [channels, mentionPopover])

	// Variables for autocompletion
	const variables = useMemo(
		() => [
			{ id: 'user', name: 'user' },
			{ id: 'server', name: 'server' },
			{ id: 'server_name', name: 'server_name' },
			{ id: 'username', name: 'username' },
			{ id: 'member_count', name: 'member_count' },
		],
		[]
	)

	// Filter variables based on search
	const filteredVariables = useMemo(() => {
		if (!mentionPopover || mentionPopover.type !== 'variable') {
			return []
		}

		return variables.filter((variable) =>
			variable.name.toLowerCase().includes(mentionPopover.search.toLowerCase())
		)
	}, [variables, mentionPopover])

	// Helper function to remove all mention placeholders
	const removeAllPlaceholders = useCallback(() => {
		try {
			Editor.normalize(editor, { force: true })

			// Ensure focus is maintained
			ReactEditor.focus(editor)

			// Then remove any placeholders that might exist
			Transforms.removeNodes(editor, {
				match: (n) =>
					SlateElement.isElement(n) && n.type === 'mention-placeholder',
			})
		} catch (err) {
			console.error('Error removing placeholders:', err)
		}
	}, [editor])

	// Create a function to safely close the popover and clean up
	const closePopover = useCallback(() => {
		if (mentionPopover) {
			console.log('Closing popover and cleaning up')
			// First remove placeholders
			removeAllPlaceholders()
			// Then close the popover
			setMentionPopover(null)
		}
	}, [mentionPopover, removeAllPlaceholders])

	// Helper function to calculate accurate anchor position
	const getAnchorPosition = useCallback(() => {
		const selection = window.getSelection()
		if (!selection || !selection.rangeCount) return null

		const range = selection.getRangeAt(0)
		const rect = range.getBoundingClientRect()

		return {
			x: rect.left,
			y: rect.bottom,
		}
	}, [])

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			if (disabled) return

			// Check if we're at the max length and prevent certain keys
			if (maxLength && charCount >= maxLength) {
				// Allow navigation keys, selection keys, and deletion keys
				const allowedKeys = [
					'ArrowLeft',
					'ArrowRight',
					'ArrowUp',
					'ArrowDown',
					'Backspace',
					'Delete',
					'Home',
					'End',
					'Tab',
					'Escape',
					'Shift',
					'Control',
					'Alt',
					'PageUp',
					'PageDown',
				]

				if (
					!allowedKeys.includes(event.key) &&
					!event.ctrlKey &&
					!event.metaKey
				) {
					event.preventDefault()
					return
				}
			}

			// If pressing Escape and we have a mention popover open, close it
			if (event.key === 'Escape' && mentionPopover) {
				event.preventDefault()
				try {
					// First set focus to ensure we can insert
					ReactEditor.focus(editor)
					// Insert '@' at current selection
					Transforms.insertText(editor, '@')
					// Then remove any placeholders that might exist
					Transforms.removeNodes(editor, {
						match: (n) =>
							SlateElement.isElement(n) && n.type === 'mention-placeholder',
					})
				} catch (err) {
					console.error('Error handling Escape:', err)
				}
				closePopover()
				return
			}

			// Handle space key to exit bold formatting
			if (event.key === ' ') {
				const { selection } = editor
				if (!selection || !Range.isCollapsed(selection)) return

				const [node, path] = Editor.node(editor, selection)

				// Check if we're in a formatted text node
				if (
					Text.isText(node) &&
					(node.bold ||
						node.strikethrough ||
						node.underline ||
						(node as { spoiler?: boolean }).spoiler)
				) {
					event.preventDefault()

					// Insert the space as a new non-formatted text node
					Editor.withoutNormalizing(editor, () => {
						// Split the node at cursor
						const point = selection.anchor
						const offset = point.offset

						// If cursor is at the end of the formatted text, just append new node
						if (offset === node.text.length) {
							// Insert a space with normal formatting
							Transforms.insertNodes(
								editor,
								{ text: ' ' },
								{ at: Editor.after(editor, path) || selection }
							)

							// Move selection to after the space
							Transforms.move(editor)
						} else {
							// If cursor is in the middle of formatted text, need to split
							// Get text before and after cursor
							const beforeText = node.text.slice(0, offset)
							const afterText = node.text.slice(offset)

							// Remove current node
							Transforms.removeNodes(editor, { at: path })

							// Extract formatting properties without the text property
							const { text: _, ...formattingProps } = node

							// Insert the parts in order: first the text after cursor (with formatting)
							if (afterText) {
								Transforms.insertNodes(
									editor,
									{ text: afterText, ...formattingProps },
									{ at: path }
								)
							}

							// Insert space (as normal text)
							Transforms.insertNodes(editor, { text: ' ' }, { at: path })

							// Insert the text before cursor (with formatting)
							if (beforeText) {
								Transforms.insertNodes(
									editor,
									{ text: beforeText, ...formattingProps },
									{ at: path }
								)
							}

							// Position cursor after the space
							Transforms.select(editor, {
								path,
								offset: beforeText.length + 1,
							})
						}
					})

					return
				}
			}

			// Basic mention triggers (@, #, {) like in mention-textarea.tsx
			if (['@', '#', '{'].includes(event.key)) {
				event.preventDefault()
				const domSel = window.getSelection()

				if (domSel && domSel.rangeCount > 0) {
					// Calculate accurate anchor position
					const anchor = getAnchorPosition()
					if (!anchor) return

					// Determine mention type based on key
					let mentionType: MentionType = 'variable'
					if (event.key === '@') mentionType = 'role'
					if (event.key === '#') mentionType = 'channel'

					// Get the current selection
					const { selection } = editor
					if (!selection) {
						ReactEditor.focus(editor)
						return
					}

					// Insert a new placeholder with the appropriate trigger character
					Transforms.insertNodes(editor, {
						type: 'mention-placeholder',
						mentionType,
						children: [{ text: '' }],
					})

					// Update local state with anchor position
					setMentionPopover({
						type: mentionType,
						search: '',
						anchor,
					})

					console.log(`Popover state set for ${mentionType}:`, {
						type: mentionType,
						search: '',
						anchor,
					})
				}

				return
			}
		},
		[
			disabled,
			editor,
			getAnchorPosition,
			mentionPopover,
			closePopover,
			maxLength,
			charCount,
		]
	)

	// Calculate row height (approximately 24px per row)
	const editorMinHeight = `${Math.max(rows * 24, 100)}px`

	return (
		<div
			className={cn(
				'relative w-full border border-input rounded-md bg-background text-sm p-3',
				disabled ? 'opacity-50 cursor-not-allowed' : '',
				className
			)}
			ref={editorContainerRef}
			id={id}
		>
			{name && <input type='hidden' name={name} value={value} />}
			<Slate
				editor={editor}
				initialValue={internalValue}
				onChange={handleSlateChange}
			>
				<Editable
					renderElement={renderElement}
					renderLeaf={renderLeaf}
					decorate={decorate}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					className='focus:outline-none'
					style={{ minHeight: editorMinHeight }}
					readOnly={disabled}
				/>

				{/* Character count display */}
				{maxLength && (
					<div
						className={`text-xs mt-1 text-right ${charCount > maxLength ? 'text-red-500' : 'text-muted-foreground'}`}
					>
						{charCount}/{maxLength}
					</div>
				)}

				{!disabled && mentionPopover && (
					<Popover
						open={true}
						onOpenChange={(open) => {
							if (!open) closePopover()
						}}
					>
						<PopoverTrigger asChild>
							<div
								className='size-0 absolute'
								style={{
									left: mentionPopover.anchor ? mentionPopover.anchor.x : 0,
									top: mentionPopover.anchor ? mentionPopover.anchor.y : 0,
									position: 'fixed',
									zIndex: 9999,
								}}
							>
								<span className='sr-only'>Toggle mention popover</span>
							</div>
						</PopoverTrigger>
						<PopoverContent className='p-0' align='start' sideOffset={5}>
							<Command>
								<CommandInput
									placeholder={
										mentionPopover.type === 'role'
											? 'Search roles...'
											: mentionPopover.type === 'channel'
												? 'Search channels...'
												: 'Search variables...'
									}
									value={mentionPopover.search}
									onValueChange={(value) =>
										setMentionPopover({
											...mentionPopover,
											search: value,
										})
									}
									onKeyDown={(e) => {
										if (e.key === 'Escape') {
											e.preventDefault()
											e.stopPropagation()
											closePopover()
											// Insert appropriate character based on mention type
											Transforms.insertText(
												editor,
												MENTION_TYPE_CONFIG[mentionPopover.type].icon
											)
										}

										if (e.key === 'Backspace') {
											e.preventDefault()
											e.stopPropagation()
											closePopover()
											// Insert appropriate character based on mention type
											Transforms.insertText(
												editor,
												MENTION_TYPE_CONFIG[mentionPopover.type].icon
											)
										}
									}}
								/>
								<CommandList>
									<CommandEmpty>No results found.</CommandEmpty>
									{mentionPopover?.type === 'role' && (
										<CommandGroup heading='Roles'>
											{filteredRoles.map((role, i) => (
												<CommandItem
													key={role.id}
													onSelect={() => {
														try {
															const [placeholderEntry] = Editor.nodes(editor, {
																match: (n) =>
																	SlateElement.isElement(n) &&
																	n.type === 'mention-placeholder',
															})

															if (placeholderEntry) {
																insertRoleMention(editor, role)
															} else {
																console.warn('No placeholder found')
																insertRoleMention(editor, role)
															}
														} catch (err) {
															console.error('Error in onSelect:', err)
															insertRoleMention(editor, role)
														} finally {
															closePopover()
														}
													}}
												>
													@{role.name}
												</CommandItem>
											))}
										</CommandGroup>
									)}

									{mentionPopover?.type === 'channel' && (
										<CommandGroup heading='Channels'>
											{filteredChannels.map((channel) => (
												<CommandItem
													key={channel.id}
													onSelect={() => {
														try {
															insertChannelMention(
																channel,
																editor,
																closePopover
															)
														} catch (err) {
															console.error(
																'Error inserting channel mention:',
																err
															)
														} finally {
															closePopover()
														}
													}}
												>
													#{channel.name}
												</CommandItem>
											))}
										</CommandGroup>
									)}

									{mentionPopover?.type === 'variable' && (
										<CommandGroup heading='Variables'>
											{filteredVariables.map((variable) => (
												<CommandItem
													key={variable.id}
													onSelect={() => {
														try {
															insertVariableMention(editor, variable)
														} catch (err) {
															console.error(
																'Error inserting variable mention:',
																err
															)
														} finally {
															closePopover()
														}
													}}
												>
													{variable.name}
												</CommandItem>
											))}
										</CommandGroup>
									)}
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				)}
			</Slate>
		</div>
	)
}

const withMentions = (editor: TestCustomEditor) => {
	const { isInline, isVoid, normalizeNode, insertText } = editor

	// Override insertText to handle text formatting after spaces
	editor.insertText = (text) => {
		const { selection } = editor

		// If not inserting a space or no selection, use default behavior
		if (text !== ' ' || !selection || !Range.isCollapsed(selection)) {
			insertText(text)
			return
		}

		// Check if we're at the end of a markdown formatting sequence
		const [node] = Editor.node(editor, selection)
		if (!Text.isText(node)) {
			insertText(text)
			return
		}

		const { text: nodeText } = node
		const { anchor } = selection
		const start = Editor.start(editor, anchor.path)
		const textBefore = Editor.string(editor, { anchor: start, focus: anchor })

		// Process the markdown formatting patterns
		const patterns = [
			// Bold: **text**
			{ pattern: /\*\*([^*]+)\*\*$/, formatType: 'bold' as const },
			// Strikethrough: ~~text~~
			{ pattern: /~~([^~]+)~~$/, formatType: 'strikethrough' as const },
			// Underline: __text__
			{ pattern: /__([^_]+)__$/, formatType: 'underline' as const },
		]

		// Try each pattern
		for (const { pattern, formatType } of patterns) {
			const match = textBefore.match(pattern)
			if (match) {
				// Delete the matched text (including markers)
				Transforms.delete(editor, {
					at: {
						anchor: {
							path: anchor.path,
							offset: anchor.offset - match[0].length,
						},
						focus: anchor,
					},
				})

				// Insert the text with formatting, followed by a space
				Transforms.insertNodes(editor, {
					text: match[1],
					[formatType]: true,
				} as CustomText)
				Transforms.insertText(editor, ' ')
				return
			}
		}

		// Spoiler: ||text||
		const spoilerMatch = textBefore.match(/\|\|([^|]+)\|\|$/)
		if (spoilerMatch) {
			// Delete the matched text (including markers)
			Transforms.delete(editor, {
				at: {
					anchor: {
						path: anchor.path,
						offset: anchor.offset - spoilerMatch[0].length,
					},
					focus: anchor,
				},
			})

			// Create a well-structured spoiler element
			const spoilerElement: SpoilerElement = {
				type: 'spoiler',
				children: [{ text: spoilerMatch[1] }],
			}

			// Insert the spoiler element
			Transforms.insertNodes(editor, spoilerElement)

			// Insert a space after
			Transforms.insertText(editor, ' ')
			return
		}

		// If we're here, no pattern was matched - insert the space normally
		insertText(text)
	}

	editor.isInline = (element: SlateElement) => {
		return element.type === 'mention' ||
			element.type === 'mention-placeholder' ||
			element.type === 'spoiler'
			? true
			: isInline(element)
	}

	editor.isVoid = (element: SlateElement) => {
		return element.type === 'mention' ||
			element.type === 'mention-placeholder' ||
			element.type === 'spoiler'
			? true
			: isVoid(element)
	}

	editor.markableVoid = (element: SlateElement) => {
		return (
			element.type === 'mention' ||
			element.type === 'mention-placeholder' ||
			element.type === 'spoiler' ||
			false
		)
	}

	// Update normalization to convert inline spoiler syntax to elements
	editor.normalizeNode = (entry) => {
		const [node, path] = entry

		// First run the original normalizeNode function
		normalizeNode(entry)

		// Only process text nodes that aren't already formatted
		if (!Text.isText(node)) return

		// Skip empty text nodes
		if (node.text === '') return

		const text = node.text

		// Process spoiler pattern - but check if we're inside a void node first
		const spoilerPattern = /\|\|([^|]+?)\|\|/
		const spoilerMatch = spoilerPattern.exec(text)
		if (spoilerMatch) {
			// Check if we're in a path that could cause normalization loops
			const parentEntry = Editor.parent(editor, path)
			const [parentNode] = parentEntry

			// Don't process spoilers if the parent is already a void element
			if (SlateElement.isElement(parentNode) && editor.isVoid(parentNode)) {
				return
			}

			const start = spoilerMatch.index
			const end = start + spoilerMatch[0].length
			const spoilerContent = spoilerMatch[1]
			const beforeText = text.slice(0, start)
			const afterText = text.slice(end)

			// Save cursor position and focus
			let currentOffset: number | null = null
			if (editor.selection && Path.equals(editor.selection.anchor.path, path)) {
				currentOffset = editor.selection.anchor.offset
			}
			const wasFocused = ReactEditor.isFocused(editor)

			// Get parent path and index
			const parentPath = Path.parent(path)
			const index = path[path.length - 1]

			// Create a new structure with spoiler element
			Editor.withoutNormalizing(editor, () => {
				// Remove the node with old text
				Transforms.removeNodes(editor, { at: path })

				// Create new nodes: text before, spoiler element, text after
				const newNodes: SlateNode[] = []
				if (beforeText) newNodes.push({ text: beforeText })

				// Create a spoiler element
				newNodes.push({
					type: 'spoiler',
					children: [{ text: spoilerContent }],
				} as SpoilerElement)

				if (afterText) newNodes.push({ text: afterText })

				// Insert new nodes
				Transforms.insertNodes(editor, newNodes, {
					at: parentPath.concat(index),
				})

				// Update cursor position if needed
				if (currentOffset !== null) {
					let newPath: number[]
					let newOffset: number

					if (currentOffset <= beforeText.length) {
						// Cursor was before the spoiler
						newPath = parentPath.concat(index)
						newOffset = currentOffset
					} else if (
						currentOffset <=
						beforeText.length + spoilerMatch[0].length
					) {
						// Cursor was inside the spoiler - place it after the spoiler
						const afterSpoilerIndex = beforeText ? index + 1 : index
						newPath = parentPath.concat(afterSpoilerIndex + 1)
						newOffset = 0
					} else {
						// Cursor was after the spoiler
						const afterTextIndex = beforeText ? index + 2 : index + 1
						newPath = parentPath.concat(afterTextIndex)
						newOffset =
							currentOffset - (beforeText.length + spoilerMatch[0].length)
					}

					// Make sure the path exists before selecting it
					try {
						const [nodeAtPath] = Editor.node(editor, newPath)
						if (Text.isText(nodeAtPath)) {
							Transforms.select(editor, { path: newPath, offset: newOffset })
						} else {
							// If it's not a text node, just move after it
							const after = Editor.after(editor, newPath)
							if (after) Transforms.select(editor, after)
						}
					} catch (e) {
						// If path doesn't exist, move to end of document
						const end = Editor.end(editor, [])
						Transforms.select(editor, end)
					}
				}

				// Restore focus
				if (wasFocused) {
					ReactEditor.focus(editor)
				}
			})
			return
		}

		// Process bold pattern
		const boldPattern = /\*\*([^*]+?)\*\*/
		const boldMatch = boldPattern.exec(text)
		if (boldMatch && !node.bold) {
			const start = boldMatch.index
			const end = start + boldMatch[0].length
			const boldContent = boldMatch[1]
			const beforeText = text.slice(0, start)
			const afterText = text.slice(end)

			// Save cursor position and focus
			let currentOffset: number | null = null
			if (editor.selection && Path.equals(editor.selection.anchor.path, path)) {
				currentOffset = editor.selection.anchor.offset
			}
			const wasFocused = ReactEditor.isFocused(editor)

			// Get parent path and index
			const parentPath = Path.parent(path)
			const index = path[path.length - 1]

			// Create a new structure with bold formatting
			Editor.withoutNormalizing(editor, () => {
				// Remove the node with old text
				Transforms.removeNodes(editor, { at: path })

				// Create new nodes: text before, bold text, space, text after
				const newNodes = []
				if (beforeText) newNodes.push({ text: beforeText })
				newNodes.push({ text: boldContent, bold: true })
				if (afterText) newNodes.push({ text: afterText })

				// Insert new nodes
				Transforms.insertNodes(editor, newNodes, {
					at: parentPath.concat(index),
				})

				// Update cursor position if needed
				if (currentOffset !== null) {
					let newPath: number[]
					let newOffset: number

					if (currentOffset <= beforeText.length) {
						// Cursor was before the bold text
						newPath = parentPath.concat(index)
						newOffset = currentOffset
					} else if (currentOffset <= beforeText.length + boldMatch[0].length) {
						// Cursor was inside the bold text
						const boldIndex = beforeText ? index + 1 : index
						newPath = parentPath.concat(boldIndex)
						newOffset = currentOffset - beforeText.length - 2 // Remove ** prefix
						newOffset = Math.max(0, Math.min(newOffset, boldContent.length))
					} else {
						// Cursor was after the bold text
						const afterTextIndex = beforeText ? index + 2 : index + 1
						newPath = parentPath.concat(afterTextIndex)
						newOffset =
							currentOffset - (beforeText.length + boldMatch[0].length)
					}

					Transforms.select(editor, { path: newPath, offset: newOffset })
				}

				// Restore focus
				if (wasFocused) {
					const domNode = ReactEditor.toDOMNode(editor, editor)
					domNode.focus()
					ReactEditor.focus(editor)
					setTimeout(() => ReactEditor.focus(editor), 10)
				}
			})
			return
		}

		// Process strikethrough pattern
		const strikePattern = /~~([^~]+?)~~/
		const strikeMatch = strikePattern.exec(text)
		if (strikeMatch && !node.strikethrough) {
			const start = strikeMatch.index
			const end = start + strikeMatch[0].length
			const strikeContent = strikeMatch[1]
			const beforeText = text.slice(0, start)
			const afterText = text.slice(end)

			// Save cursor position and focus
			let currentOffset: number | null = null
			if (editor.selection && Path.equals(editor.selection.anchor.path, path)) {
				currentOffset = editor.selection.anchor.offset
			}
			const wasFocused = ReactEditor.isFocused(editor)

			// Get parent path and index
			const parentPath = Path.parent(path)
			const index = path[path.length - 1]

			// Create a new structure with strikethrough formatting
			Editor.withoutNormalizing(editor, () => {
				// Remove the node with old text
				Transforms.removeNodes(editor, { at: path })

				// Create new nodes: text before, strikethrough text, text after
				const newNodes = []
				if (beforeText) newNodes.push({ text: beforeText })
				newNodes.push({ text: strikeContent, strikethrough: true })
				if (afterText) newNodes.push({ text: afterText })

				// Insert new nodes
				Transforms.insertNodes(editor, newNodes, {
					at: parentPath.concat(index),
				})

				// Update cursor position if needed
				if (currentOffset !== null) {
					let newPath: number[]
					let newOffset: number

					if (currentOffset <= beforeText.length) {
						// Cursor was before the strikethrough text
						newPath = parentPath.concat(index)
						newOffset = currentOffset
					} else if (
						currentOffset <=
						beforeText.length + strikeMatch[0].length
					) {
						// Cursor was inside the strikethrough text
						const strikethroughIndex = beforeText ? index + 1 : index
						newPath = parentPath.concat(strikethroughIndex)
						newOffset = currentOffset - beforeText.length - 2 // Remove ~~ prefix
						newOffset = Math.max(0, Math.min(newOffset, strikeContent.length))
					} else {
						// Cursor was after the strikethrough text
						const afterTextIndex = beforeText ? index + 2 : index + 1
						newPath = parentPath.concat(afterTextIndex)
						newOffset =
							currentOffset - (beforeText.length + strikeMatch[0].length)
					}

					Transforms.select(editor, { path: newPath, offset: newOffset })
				}

				// Restore focus
				if (wasFocused) {
					const domNode = ReactEditor.toDOMNode(editor, editor)
					domNode.focus()
					ReactEditor.focus(editor)
					setTimeout(() => ReactEditor.focus(editor), 10)
				}
			})
			return
		}

		// Process underline pattern
		const underlinePattern = /__([^_]+?)__/
		const underlineMatch = underlinePattern.exec(text)
		if (underlineMatch && !node.underline) {
			const start = underlineMatch.index
			const end = start + underlineMatch[0].length
			const underlineContent = underlineMatch[1]
			const beforeText = text.slice(0, start)
			const afterText = text.slice(end)

			// Save cursor position and focus
			let currentOffset: number | null = null
			if (editor.selection && Path.equals(editor.selection.anchor.path, path)) {
				currentOffset = editor.selection.anchor.offset
			}
			const wasFocused = ReactEditor.isFocused(editor)

			// Get parent path and index
			const parentPath = Path.parent(path)
			const index = path[path.length - 1]

			// Create a new structure with underline formatting
			Editor.withoutNormalizing(editor, () => {
				// Remove the node with old text
				Transforms.removeNodes(editor, { at: path })

				// Create new nodes: text before, underline text, text after
				const newNodes = []
				if (beforeText) newNodes.push({ text: beforeText })
				newNodes.push({ text: underlineContent, underline: true })
				if (afterText) newNodes.push({ text: afterText })

				// Insert new nodes
				Transforms.insertNodes(editor, newNodes, {
					at: parentPath.concat(index),
				})

				// Update cursor position if needed
				if (currentOffset !== null) {
					let newPath: number[]
					let newOffset: number

					if (currentOffset <= beforeText.length) {
						// Cursor was before the underline text
						newPath = parentPath.concat(index)
						newOffset = currentOffset
					} else if (
						currentOffset <=
						beforeText.length + underlineMatch[0].length
					) {
						// Cursor was inside the underline text
						const underlineIndex = beforeText ? index + 1 : index
						newPath = parentPath.concat(underlineIndex)
						newOffset = currentOffset - beforeText.length - 2 // Remove __ prefix
						newOffset = Math.max(
							0,
							Math.min(newOffset, underlineContent.length)
						)
					} else {
						// Cursor was after the underline text
						const afterTextIndex = beforeText ? index + 2 : index + 1
						newPath = parentPath.concat(afterTextIndex)
						newOffset =
							currentOffset - (beforeText.length + underlineMatch[0].length)
					}

					Transforms.select(editor, { path: newPath, offset: newOffset })
				}

				// Restore focus
				if (wasFocused) {
					const domNode = ReactEditor.toDOMNode(editor, editor)
					domNode.focus()
					ReactEditor.focus(editor)
					setTimeout(() => ReactEditor.focus(editor), 10)
				}
			})
			return
		}
	}

	return editor
}

// Function to insert a role mention
const insertRoleMention = (
	editor: TestCustomEditor,
	role: { id: string; name: string }
) => {
	try {
		// First, find the placeholder if it exists
		const [placeholderEntry] = Editor.nodes(editor, {
			match: (n) =>
				SlateElement.isElement(n) && n.type === 'mention-placeholder',
		})

		const mention: StarWarsMentionElement = {
			type: 'mention',
			mentionType: 'role',
			value: role.id,
			displayValue: role.name,
			children: [{ text: '' }],
		}

		if (placeholderEntry) {
			const [_, path] = placeholderEntry
			// Remove the placeholder and insert the mention at the same location
			Transforms.removeNodes(editor, { at: path })
			Transforms.insertNodes(editor, mention as unknown as SlateNode, {
				at: path,
			})

			// Add an empty text node after the mention if needed
			// to ensure there's a valid position to place the cursor
			const after = Editor.after(editor, path)
			if (after) {
				Transforms.select(editor, after)
			} else {
				// If there's no valid position after the mention, create one
				const end = Editor.end(editor, [])
				Transforms.insertNodes(editor, { text: ' ' }, { at: end })
				Transforms.select(editor, Editor.after(editor, end) || end)
			}

			// Ensure the editor has focus
			ReactEditor.focus(editor)

			// Double-check focus with a small delay
			setTimeout(() => {
				ReactEditor.focus(editor)
			}, 10)
		} else {
			// Fallback: just insert at current position
			Transforms.insertNodes(editor, mention as unknown as SlateNode)
			Transforms.move(editor) // Move cursor after insertion
			ReactEditor.focus(editor)
		}
	} catch (err) {
		console.error('Error inserting role mention:', err)
		// Fallback to original behavior
		const mention: StarWarsMentionElement = {
			type: 'mention',
			mentionType: 'role',
			value: role.id,
			displayValue: role.name,
			children: [{ text: '' }],
		}
		Transforms.insertNodes(editor, mention as unknown as SlateNode)
		Transforms.move(editor) // Move cursor forward
		ReactEditor.focus(editor)
	}
}

// Function to insert a channel mention
const insertChannelMention = (
	channel: RawChannel,
	editor: TestCustomEditor,
	closePopoverFn: () => void
) => {
	try {
		if (!channel.id || !channel.name) {
			console.error('Cannot insert channel without id and name', channel)
			return
		}

		console.log(
			`Inserting channel mention: id=${channel.id}, name=${channel.name}`
		)

		// First set focus to ensure we can insert
		ReactEditor.focus(editor)

		// Remove any existing mention placeholder node at the current selection
		Transforms.removeNodes(editor, {
			match: (n) =>
				SlateElement.isElement(n) && n.type === 'mention-placeholder',
		})

		// Get the channel name
		const channelName = channel.name || ''

		// Insert a mention element at the current selection
		Transforms.insertNodes(editor, {
			type: 'mention',
			mentionType: 'channel',
			value: channel.id,
			displayValue: channelName, // Use the name immediately
			children: [{ text: '' }],
		} as StarWarsMentionElement)

		// Check if we need to apply any formatting to the mention
		const { selection } = editor
		if (selection) {
			// Move selection to after the mention
			const point = Editor.after(editor, selection)
			if (point) {
				Transforms.select(editor, point)
			}
		}

		// Close any open mention popovers
		closePopoverFn()
	} catch (err) {
		console.error('Error inserting channel mention:', err)
	}
}

// Function to insert a variable mention
const insertVariableMention = (
	editor: TestCustomEditor,
	variable: { id: string; name: string }
) => {
	try {
		// First, find the placeholder if it exists
		const [placeholderEntry] = Editor.nodes(editor, {
			match: (n) =>
				SlateElement.isElement(n) && n.type === 'mention-placeholder',
		})

		const mention: StarWarsMentionElement = {
			type: 'mention',
			mentionType: 'variable',
			value: variable.name,
			displayValue: variable.name,
			children: [{ text: '' }],
		}

		if (placeholderEntry) {
			const [_, path] = placeholderEntry
			// Remove the placeholder and insert the mention at the same location
			Transforms.removeNodes(editor, { at: path })
			Transforms.insertNodes(editor, mention as unknown as SlateNode, {
				at: path,
			})

			// Add an empty text node after the mention if needed
			// to ensure there's a valid position to place the cursor
			const after = Editor.after(editor, path)
			if (after) {
				Transforms.select(editor, after)
			} else {
				// If there's no valid position after the mention, create one
				const end = Editor.end(editor, [])
				Transforms.insertNodes(editor, { text: ' ' }, { at: end })
				Transforms.select(editor, Editor.after(editor, end) || end)
			}

			// Ensure the editor has focus
			ReactEditor.focus(editor)

			// Double-check focus with a small delay
			setTimeout(() => {
				ReactEditor.focus(editor)
			}, 10)
		} else {
			// Fallback: just insert at current position
			Transforms.insertNodes(editor, mention as unknown as SlateNode)
			Transforms.move(editor) // Move cursor after insertion
			ReactEditor.focus(editor)
		}
	} catch (err) {
		console.error('Error inserting variable mention:', err)
		// Fallback to original behavior
		const mention: StarWarsMentionElement = {
			type: 'mention',
			mentionType: 'variable',
			value: variable.name,
			displayValue: variable.name,
			children: [{ text: '' }],
		}
		Transforms.insertNodes(editor, mention as unknown as SlateNode)
		Transforms.move(editor) // Move cursor forward
		ReactEditor.focus(editor)
	}
}

// Update Leaf renderer for formatting including Markdown highlighting
const Leaf = ({ attributes, children, leaf }: CustomRenderLeafProps) => {
	if (leaf.bold) {
		// Use a plain <strong> tag for real-time rendering of bold text
		children = <strong>{children}</strong>
	}

	if (leaf.code) {
		children = (
			<code className='bg-muted px-1 py-0.5 rounded text-sm font-mono'>
				{children}
			</code>
		)
	}

	if (leaf.italic) {
		children = <em>{children}</em>
	}

	if (leaf.underline) {
		children = <u>{children}</u>
	}

	if (leaf.strikethrough) {
		children = <s>{children}</s>
	}

	if (leaf.spoiler) {
		children = (
			<span className='bg-gray-800 text-transparent hover:text-white cursor-pointer'>
				{children}
			</span>
		)
	}

	// Add Markdown syntax highlighting styles
	if (leaf.title) {
		return (
			<span {...attributes} className='inline-block font-bold text-lg my-2'>
				{children}
			</span>
		)
	}

	if (leaf.list) {
		return (
			<span {...attributes} className='text-blue-600'>
				{children}
			</span>
		)
	}

	if (leaf.hr) {
		return (
			<span
				{...attributes}
				className='block text-center border-b-2 border-gray-300'
			>
				{children}
			</span>
		)
	}

	if (leaf.blockquote) {
		return (
			<span
				{...attributes}
				className='inline-block border-l-2 border-gray-300 pl-2 text-gray-500 italic'
			>
				{children}
			</span>
		)
	}

	if (leaf.url) {
		return (
			<span {...attributes} className='text-blue-500 underline'>
				{children}
			</span>
		)
	}

	if (leaf.keyword) {
		return (
			<span {...attributes} className='text-purple-600 font-bold'>
				{children}
			</span>
		)
	}

	if (leaf.punctuation) {
		return (
			<span {...attributes} className='text-gray-500'>
				{children}
			</span>
		)
	}

	return <span {...attributes}>{children}</span>
}

const MENTION_TYPE_CONFIG: Record<
	MentionType,
	{
		icon: string
		style: string
		prefix: string
	}
> = {
	role: {
		icon: '@',
		style: 'bg-blue-100 text-blue-800 border-blue-300',
		prefix: '@',
	},
	channel: {
		icon: '#',
		style: 'bg-green-100 text-green-800 border-green-300',
		prefix: '#',
	},
	variable: {
		icon: '{',
		style: 'bg-amber-100 text-amber-800 border-amber-300',
		prefix: '',
	},
}

const Element = (props: RenderElementProps) => {
	const { attributes, children, element } = props
	switch (element.type) {
		case 'mention':
			return (
				<Mention
					{...(props as RenderElementPropsFor<StarWarsMentionElement>)}
				/>
			)
		case 'spoiler':
			return <Spoiler {...(props as RenderElementPropsFor<SpoilerElement>)} />
		case 'mention-placeholder':
			return (
				<span
					{...attributes}
					contentEditable={false}
					className={cn(
						'inline-block px-1.5 py-0.5 m-0.5 rounded-md text-sm font-medium border',
						MENTION_TYPE_CONFIG[element.mentionType].style
					)}
					data-slate-void='true'
				>
					<span style={{ display: 'none' }}>{children}</span>
					{MENTION_TYPE_CONFIG[element.mentionType].icon}
				</span>
			)
		default:
			return <p {...attributes}>{children}</p>
	}
}

const Mention = ({
	attributes,
	children,
	element,
}: RenderElementPropsFor<StarWarsMentionElement>) => {
	const selected = useSelected()
	const focused = useFocused()

	// Add debugging log to see what's actually in the element
	console.log('Rendering mention:', {
		type: element.mentionType,
		value: element.value,
		displayValue: element.displayValue,
	})

	// Define the text to display based on mention type
	let displayContent: string
	if (element.mentionType === 'channel') {
		displayContent = `#${element.displayValue || element.value}`
	} else if (element.mentionType === 'role') {
		displayContent = `@${element.displayValue}`
	} else {
		displayContent = element.displayValue
	}

	return (
		<span
			{...attributes}
			contentEditable={false}
			data-cy={`mention-${element.value.replace(' ', '-')}`}
			data-mention-type={element.mentionType}
			data-value={element.value}
			data-display={element.displayValue} // Add data attribute for debugging
			className={cn(
				'inline-block px-1.5 py-0.5 m-0.5 rounded-md text-sm font-medium border',
				MENTION_TYPE_CONFIG[element.mentionType].style,
				selected && focused ? 'ring-2 ring-blue-300' : ''
			)}
			data-slate-void='true'
			aria-atomic='true'
			role='button'
		>
			{/* Hide Slate's internal children from user */}
			<span style={{ display: 'none' }}>{children}</span>
			{/* Use the displayContent directly */}
			{displayContent}
		</span>
	)
}

const Spoiler = ({
	attributes,
	children,
	element,
}: RenderElementPropsFor<SpoilerElement>) => {
	const selected = useSelected()
	const focused = useFocused()

	const textContent = element.children?.[0]?.text || ''

	return (
		<React.Fragment>
			<span className='text-slate-500 mr-0.5'>||</span>
			<span
				{...attributes}
				data-slate-void='true'
				className={cn(
					'inline-block px-1.5 py-0.5 rounded-md text-sm relative',
					'bg-slate-300/50 text-slate-700 transition-colors',
					selected && focused ? 'ring-2 ring-blue-300' : ''
				)}
				contentEditable={false}
			>
				<span contentEditable={false}>{textContent}</span>
				{children}
			</span>
			<span className='text-slate-500 ml-0.5'>||</span>
		</React.Fragment>
	)
}

// Export the component for direct use
export { TestMentionTextarea }

// Create a form-ready version of the component for use with React Hook Form
import { useFormContext } from 'react-hook-form'
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
} from '@/components/ui/form'
import { tryCatch } from '@/lib/try-catch'

// Form field props interface
interface TestMentionFieldProps {
	name: string
	label?: string
	description?: string
	placeholder?: string
	disabled?: boolean
	className?: string
	rows?: number
	maxLength?: number
	id?: string
}

// Form-integrated version of the component
export function TestMentionField({
	name,
	label,
	description,
	placeholder = "Type '@' to mention someone...",
	disabled = false,
	className,
	rows = 3,
	maxLength,
	id,
}: TestMentionFieldProps) {
	const form = useFormContext()

	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => (
				<FormItem>
					{label && <FormLabel>{label}</FormLabel>}
					<FormControl>
						<TestMentionTextarea
							name={name}
							value={field.value}
							onChange={field.onChange}
							placeholder={placeholder}
							disabled={disabled || field.disabled}
							className={className}
							rows={rows}
							maxLength={maxLength}
							id={id}
						/>
					</FormControl>
					{description && <FormDescription>{description}</FormDescription>}
					<FormMessage />
				</FormItem>
			)}
		/>
	)
}
