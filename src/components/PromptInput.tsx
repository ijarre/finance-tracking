import React from 'react';
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
}

const PromptInput: React.FC<PromptInputProps> = ({ value, onChange }) => {
  return (
    <Card className="bg-background/60 backdrop-blur-sm">
      <CardContent className="pt-6">
        <div className="grid w-full gap-2">
          <Label htmlFor="prompt" className="text-primary font-semibold">System Prompt</Label>
          <Textarea 
            id="prompt"
            placeholder="Enter your prompt for the LLM..." 
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[120px] font-mono bg-background/50"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default PromptInput;
