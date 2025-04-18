import * as React from "react";
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Pencil, Save, X, User as UserIcon } from "lucide-react";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { LoraAsset, UserProfile } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { getCurrentUserProfile } from '@/lib/auth/userProfile';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from 'react-router-dom';
import { Skeleton } from "@/components/ui/skeleton";
import LoraCreatorInfo from './LoraCreatorInfo';

const MODEL_VARIANTS = {
  wan: ['1.3b', '14b T2V', '14b I2V'],
  ltxv: ['0.9', '0.9.5', '0.9.7'],
  hunyuan: ['Base', 'Large', 'Mini'],
  cogvideox: ['Base', 'SD', 'SDXL'],
  animatediff: ['Base', 'v3', 'Lightning']
};

interface EditableLoraDetailsProps {
  asset: LoraAsset | null;
  isAuthorized: boolean;
  onDetailsUpdated: () => void;
}

const EditableLoraDetails: React.FC<EditableLoraDetailsProps> = ({
  asset,
  isAuthorized,
  onDetailsUpdated
}) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [creatorProfile, setCreatorProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Helper function to determine if the current user owns the asset
  const isOwnedByCurrentUser = () => {
    return user && asset?.user_id === user.id;
  };

  const [details, setDetails] = useState({
    name: asset?.name || '',
    description: asset?.description || '',
    creator: isOwnedByCurrentUser() ? 'self' : 'someone_else',
    creatorName: asset?.creator?.includes('@') ? asset.creator.substring(1) : asset?.creator || '',
    lora_type: asset?.lora_type || 'Concept',
    lora_base_model: asset?.lora_base_model || 'Wan',
    model_variant: asset?.model_variant || '',
    lora_link: asset?.lora_link || ''
  });

  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        const profile = await getCurrentUserProfile();
        setUserProfile(profile);
      }
    };
    loadUserProfile();
  }, [user]);

  const handleEdit = () => {
    setDetails({
      name: asset?.name || '',
      description: asset?.description || '',
      creator: isOwnedByCurrentUser() ? 'self' : 'someone_else',
      creatorName: asset?.creator?.includes('@') ? asset.creator.substring(1) : asset?.creator || '',
      lora_type: asset?.lora_type || 'Concept',
      lora_base_model: asset?.lora_base_model || 'Wan',
      model_variant: asset?.model_variant || '',
      lora_link: asset?.lora_link || ''
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!asset || !user || !userProfile) return;
    
    setIsSaving(true);
    try {
      const updates: any = {
        name: details.name,
        description: details.description,
        lora_type: details.lora_type,
        lora_base_model: details.lora_base_model,
        model_variant: details.model_variant,
        lora_link: details.lora_link
      };

      if (details.creator === 'self') {
        updates.creator = userProfile.display_name || userProfile.username;
        updates.user_id = user.id;
      } else {
        updates.creator = `@${details.creatorName}`;
        // When changing from self to someone else, clear the user_id
        if (isOwnedByCurrentUser()) {
          updates.user_id = null;
        }
      }

      const { error } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', asset.id);
      
      if (error) throw error;
      
      onDetailsUpdated();
      setIsEditing(false);
      toast.success('LoRA details updated successfully');
    } catch (error) {
      console.error('Error updating LoRA details:', error);
      toast.error('Failed to update LoRA details');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="lora-name" className="text-sm font-medium mb-1.5 block">
              LoRA Name <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              id="lora-name"
              placeholder="Enter LoRA name"
              value={details.name}
              onChange={(e) => updateField('name', e.target.value)}
              required
              disabled={isSaving}
            />
          </div>
          
          <div>
            <Label htmlFor="lora-description" className="text-sm font-medium mb-1.5 block">
              LoRA Description
            </Label>
            <Textarea
              id="lora-description"
              placeholder="Enter LoRA description"
              value={details.description}
              onChange={(e) => updateField('description', e.target.value)}
              disabled={isSaving}
              className="min-h-[100px]"
            />
          </div>

          <div>
            <Label className="text-sm font-medium block mb-2">
              Who made this LoRA?
            </Label>
            <RadioGroup 
              value={details.creator}
              onValueChange={(value: 'self' | 'someone_else') => updateField('creator', value)}
              className="flex flex-col space-y-2"
              disabled={isSaving}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="self" id="lora-creator-self" />
                <Label htmlFor="lora-creator-self" className="cursor-pointer">I made it</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="someone_else" id="lora-creator-someone" />
                <Label htmlFor="lora-creator-someone" className="cursor-pointer">Someone else made it</Label>
              </div>
            </RadioGroup>
          </div>

          {details.creator === 'someone_else' && (
            <div>
              <Label htmlFor="creator-name" className="text-sm font-medium mb-1.5 block">
                Creator Username <span className="text-destructive">*</span>
              </Label>
              <Input
                type="text"
                id="creator-name"
                placeholder="Username of the creator"
                value={details.creatorName}
                onChange={(e) => updateField('creatorName', e.target.value)}
                required
                disabled={isSaving}
              />
            </div>
          )}

          <div>
            <Label htmlFor="lora-model" className="text-sm font-medium mb-1.5 block">
              Which model was this trained on? <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={details.lora_base_model} 
              onValueChange={(value: 'Wan' | 'Hunyuan' | 'LTXV' | 'CogVideoX' | 'AnimateDiff') => updateField('lora_base_model', value)}
              disabled={isSaving}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Wan">Wan</SelectItem>
                <SelectItem value="Hunyuan">Hunyuan</SelectItem>
                <SelectItem value="LTXV">LTXV</SelectItem>
                <SelectItem value="CogVideoX">CogVideoX</SelectItem>
                <SelectItem value="AnimateDiff">AnimateDiff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="model-variant" className="text-sm font-medium mb-1.5 block">
              Model Variant
            </Label>
            {MODEL_VARIANTS[details.lora_base_model as keyof typeof MODEL_VARIANTS] ? (
              <Select 
                value={details.model_variant} 
                onValueChange={(value) => updateField('model_variant', value)}
                disabled={isSaving}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Variant" />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_VARIANTS[details.lora_base_model as keyof typeof MODEL_VARIANTS].map(variant => (
                    <SelectItem key={variant} value={variant}>{variant}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="text"
                id="model-variant"
                placeholder="Enter model variant"
                value={details.model_variant}
                onChange={(e) => updateField('model_variant', e.target.value)}
                disabled={isSaving}
              />
            )}
          </div>

          <div>
            <Label htmlFor="lora-type" className="text-sm font-medium mb-1.5 block">
              What type of LoRA is this? <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={details.lora_type} 
              onValueChange={(value) => updateField('lora_type', value)}
              disabled={isSaving}
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
              value={details.lora_link}
              onChange={(e) => updateField('lora_link', e.target.value)}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="flex space-x-2">
          <Button 
            onClick={handleSave} 
            className="gap-1"
            disabled={isSaving || !details.name}
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button 
            onClick={handleCancel} 
            variant="outline" 
            className="gap-1"
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end">
        {isAuthorized && (
          <Button variant="ghost" size="sm" onClick={handleEdit} className="h-7 px-2 py-1.5">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Creator</Label>
        <LoraCreatorInfo asset={asset} avatarSize="h-6 w-6" textSize="text-sm" />
      </div>

      {asset?.description && (
         <div className="space-y-1 mt-3">
          <Label className="text-xs text-muted-foreground">Description</Label>
          <p className="text-sm whitespace-pre-wrap">{asset.description}</p>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-x-4 mt-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Base Model</Label>
          <p className="text-sm font-medium">{asset?.lora_base_model || 'N/A'}</p>
        </div>
        {asset?.model_variant && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Model Variant</Label>
            <p className="text-sm font-medium">{asset.model_variant}</p>
          </div>
        )}
      </div>

      <div className="space-y-1 mt-2">
        <Label className="text-xs text-muted-foreground">Type</Label>
        <p className="text-sm font-medium">{asset?.lora_type || 'N/A'}</p>
      </div>
    </div>
  );
};

export default EditableLoraDetails;
