import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { Clip } from "@/types/timeline";

interface TextEditorProps {
	onAddText: (clip: Clip) => void;
	trigger?: React.ReactNode;
}

interface TextProperties {
	text: string;
	fontFamily: string;
	fontSize: number;
	color: string;
	x: number;
	y: number;
	duration: number;
	animation?: "none" | "fade" | "slide";
}

const FONT_FAMILIES = [
	"Arial",
	"Helvetica",
	"Times New Roman",
	"Georgia",
	"Verdana",
	"Courier New",
	"Comic Sans MS",
	"Impact",
	"Trebuchet MS",
	"Lucida Console",
];

export function TextEditor({ onAddText, trigger }: TextEditorProps) {
	const [open, setOpen] = useState(false);
	const [textProps, setTextProps] = useState<TextProperties>({
		text: "Enter text here",
		fontFamily: "Arial",
		fontSize: 48,
		color: "#ffffff",
		x: 100,
		y: 100,
		duration: 5,
		animation: "none",
	});

	const handleAddText = () => {
		// Create a text clip with the specified properties
		const textClip: Clip = {
			id: uuidv4(),
			resourceId: "", // Text clips don't need a resource
			startTime: 0, // Will be placed at current timeline position
			duration: textProps.duration,
			trimStart: 0,
			trimEnd: 0,
			position: {
				x: textProps.x,
				y: textProps.y,
			},
			// Store text-specific data
			data: {
				type: "text",
				text: textProps.text,
				fontFamily: textProps.fontFamily,
				fontSize: textProps.fontSize,
				color: textProps.color,
				animation: textProps.animation,
			},
		};

		onAddText(textClip);
		setOpen(false);

		// Reset form
		setTextProps({
			text: "Enter text here",
			fontFamily: "Arial",
			fontSize: 48,
			color: "#ffffff",
			x: 100,
			y: 100,
			duration: 5,
			animation: "none",
		});
	};

	const updateTextProp = <K extends keyof TextProperties>(key: K, value: TextProperties[K]) => {
		setTextProps((prev) => ({ ...prev, [key]: value }));
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger || <Button variant="outline">Add Text</Button>}</DialogTrigger>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Add Text to Timeline</DialogTitle>
					<DialogDescription>Configure text properties and add it to your video timeline.</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					{/* Text Content */}
					<div className="grid gap-2">
						<Label htmlFor="text">Text Content</Label>
						<Textarea
							id="text"
							value={textProps.text}
							onChange={(e) => updateTextProp("text", e.target.value)}
							placeholder="Enter your text here..."
							rows={3}
						/>
					</div>

					{/* Font Family */}
					<div className="grid gap-2">
						<Label htmlFor="fontFamily">Font Family</Label>
						<Select value={textProps.fontFamily} onValueChange={(value) => updateTextProp("fontFamily", value)}>
							<SelectTrigger id="fontFamily">
								<SelectValue placeholder="Select font" />
							</SelectTrigger>
							<SelectContent>
								{FONT_FAMILIES.map((font) => (
									<SelectItem key={font} value={font}>
										<span style={{ fontFamily: font }}>{font}</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Font Size */}
					<div className="grid gap-2">
						<Label htmlFor="fontSize">Font Size: {textProps.fontSize}px</Label>
						<Slider
							id="fontSize"
							min={12}
							max={200}
							step={1}
							value={[textProps.fontSize]}
							onValueChange={([value]) => updateTextProp("fontSize", value)}
						/>
					</div>

					{/* Text Color */}
					<div className="grid gap-2">
						<Label htmlFor="color">Text Color</Label>
						<div className="flex gap-2 items-center">
							<Input
								id="color"
								type="color"
								value={textProps.color}
								onChange={(e) => updateTextProp("color", e.target.value)}
								className="w-16 h-10 p-1 cursor-pointer"
							/>
							<Input
								type="text"
								value={textProps.color}
								onChange={(e) => updateTextProp("color", e.target.value)}
								placeholder="#ffffff"
								className="flex-1"
							/>
						</div>
					</div>

					{/* Position */}
					<div className="grid grid-cols-2 gap-4">
						<div className="grid gap-2">
							<Label htmlFor="positionX">Position X</Label>
							<Input
								id="positionX"
								type="number"
								value={textProps.x}
								onChange={(e) => updateTextProp("x", parseInt(e.target.value) || 0)}
								min={0}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="positionY">Position Y</Label>
							<Input
								id="positionY"
								type="number"
								value={textProps.y}
								onChange={(e) => updateTextProp("y", parseInt(e.target.value) || 0)}
								min={0}
							/>
						</div>
					</div>

					{/* Duration */}
					<div className="grid gap-2">
						<Label htmlFor="duration">Duration (seconds)</Label>
						<Input
							id="duration"
							type="number"
							value={textProps.duration}
							onChange={(e) => updateTextProp("duration", parseFloat(e.target.value) || 1)}
							min={0.1}
							step={0.1}
						/>
					</div>

					{/* Animation */}
					<div className="grid gap-2">
						<Label htmlFor="animation">Animation</Label>
						<Select
							value={textProps.animation}
							onValueChange={(value: "none" | "fade" | "slide") => updateTextProp("animation", value)}>
							<SelectTrigger id="animation">
								<SelectValue placeholder="Select animation" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">None</SelectItem>
								<SelectItem value="fade">Fade In/Out</SelectItem>
								<SelectItem value="slide">Slide In</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button onClick={handleAddText} disabled={!textProps.text.trim()}>
						Add Text to Timeline
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
