
import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface LoRADetailsForm {
  loraName: string;
  loraDescription: string;
  creator: 'self' | 'someone_else';
  creatorName: string;
  creatorOrigin?: string;
  model: 'wan' | 'hunyuan' | 'ltxv' | 'cogvideox' | 'animatediff';
  modelVariant: string;
  loraType: 'Concept' | 'Motion Style' | 'Specific Movement' | 'Aesthetic Style' | 'Control' | 'Other';
  loraLink: string;
}

interface GlobalLoRADetailsFormProps {
  loraDetails: LoRADetailsForm;
  updateLoRADetails: (field: keyof LoRADetailsForm, value: string) => void;
  disabled?: boolean;
}

const MODEL_VARIANTS = {
  wan: ['1.3b', '14b T2V', '14b I2V'],
  ltxv: ['0.9', '0.9.5', '0.9.7'],
  hunyuan: ['Base', 'Large', 'Mini'],
  cogvideox: ['Base', 'SD', 'SDXL'],
  animatediff: ['Base', 'v3', 'Lightning']
};

const GlobalLoRADetailsForm: React.FC<GlobalLoRADetailsFormProps> = ({ 
  loraDetails, 
  updateLoRADetails,
  disabled = false
}) => {
  const { user } = useAuth();
  
  // Update model variant when model changes
  useEffect(() => {
    if (loraDetails.model && MODEL_VARIANTS[loraDetails.model]?.length > 0) {
      const variants = MODEL_VARIANTS[loraDetails.model as keyof typeof MODEL_VARIANTS];
      if (!variants.includes(loraDetails.modelVariant)) {
        updateLoRADetails('modelVariant', variants[0]);
      }
    }
  }, [loraDetails.model]);
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
            <div>
              <Label htmlFor="lora-name" className="text-sm font-medium mb-1.5 block">
                LoRA Name <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                id="lora-name"
                placeholder="Enter LoRA name"
                value={loraDetails.loraName}
                onChange={(e) => updateLoRADetails('loraName', e.target.value)}
                required
                disabled={disabled}
              />
            </div>
            
            <div>
              <Label htmlFor="lora-description" className="text-sm font-medium mb-1.5 block">
                LoRA Description
              </Label>
              <Textarea
                id="lora-description"
                placeholder="Enter LoRA description"
                value={loraDetails.loraDescription}
                onChange={(e) => updateLoRADetails('loraDescription', e.target.value)}
                disabled={disabled}
                className="min-h-[100px]"
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Creator Information</h3>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Who made this LoRA?
              </Label>
              <RadioGroup 
                value={loraDetails.creator}
                onValueChange={(value: 'self' | 'someone_else') => updateLoRADetails('creator', value)}
                className="flex flex-col space-y-2"
                disabled={disabled}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="self" id="lora-creator-self" />
                  <Label htmlFor="lora-creator-self" className="cursor-pointer">Me</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="someone_else" id="lora-creator-someone" />
                  <Label htmlFor="lora-creator-someone" className="cursor-pointer">Someone else</Label>
                </div>
              </RadioGroup>
            </div>

            {loraDetails.creator === 'someone_else' && (
              <div>
                <Label htmlFor="creator-name" className="text-sm font-medium mb-1.5 block">
                  Creator Username <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  id="creator-name"
                  placeholder="Username of the creator"
                  value={loraDetails.creatorName}
                  onChange={(e) => updateLoRADetails('creatorName', e.target.value)}
                  required
                  disabled={disabled}
                />
              </div>
            )}
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Technical Details</h3>
            
            <div>
              <Label htmlFor="lora-model" className="text-sm font-medium mb-1.5 block">
                Which model was this trained on? <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={loraDetails.model} 
                onValueChange={(value: 'wan' | 'hunyuan' | 'ltxv' | 'cogvideox' | 'animatediff') => updateLoRADetails('model', value)}
                disabled={disabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wan">Wan</SelectItem>
                  <SelectItem value="hunyuan">Hunyuan</SelectItem>
                  <SelectItem value="ltxv">LTXV</SelectItem>
                  <SelectItem value="cogvideox">CogVideoX</SelectItem>
                  <SelectItem value="animatediff">AnimateDiff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="model-variant" className="text-sm font-medium mb-1.5 block">
                Model Variant <span className="text-destructive">*</span>
              </Label>
              {MODEL_VARIANTS[loraDetails.model as keyof typeof MODEL_VARIANTS] ? (
                <Select 
                  value={loraDetails.modelVariant} 
                  onValueChange={(value) => updateLoRADetails('modelVariant', value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_VARIANTS[loraDetails.model as keyof typeof MODEL_VARIANTS].map(variant => (
                      <SelectItem key={variant} value={variant}>{variant}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="text"
                  id="model-variant"
                  placeholder="Enter model variant"
                  value={loraDetails.modelVariant}
                  onChange={(e) => updateLoRADetails('modelVariant', e.target.value)}
                  disabled={disabled}
                />
              )}
            </div>
            
            <div>
              <Label htmlFor="lora-type" className="text-sm font-medium mb-1.5 block">
                What type of LoRA is this? <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={loraDetails.loraType} 
                onValueChange={(value) => updateLoRADetails('loraType', value)}
                disabled={disabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select LoRA type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Concept">Concept</SelectItem>
                  <SelectItem value="Motion Style">Motion Style</SelectItem>
                  <SelectItem value="Specific Movement">Specific Movement</SelectItem>
                  <SelectItem value="Aesthetic Style">Aesthetic Style</SelectItem>
                  <SelectItem value="Control">Control</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="lora-link" className="text-sm font-medium mb-1.5 block">
                LoRA Link (Huggingface, Civit, etc.)
              </Label>
              <Input
                type="url"
                id="lora-link"
                placeholder="Enter LoRA link"
                value={loraDetails.loraLink}
                onChange={(e) => updateLoRADetails('loraLink', e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GlobalLoRADetailsForm;
