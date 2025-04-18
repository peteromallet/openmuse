"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

type LoraOption = {
  id: string;
  name: string;
}

interface LoraMultiSelectComboboxProps {
  loras: LoraOption[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function LoraMultiSelectCombobox({
  loras,
  selectedIds,
  setSelectedIds,
  placeholder = "Select LoRAs...",
  searchPlaceholder = "Search LoRAs...",
  noResultsText = "No LoRA found.",
  triggerClassName,
  disabled = false,
}: LoraMultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const handleSelect = React.useCallback((loraId: string, checked: boolean) => {
    if (disabled) return;
    
    console.log(`[LoraMultiSelectCombobox] handleSelect triggered for LoRA ID: ${loraId}, Checked: ${checked}`);

    const newSelectedIds = checked
      ? [...selectedIds, loraId]
      : selectedIds.filter(id => id !== loraId);
    
    console.log(`[LoraMultiSelectCombobox] Calling setSelectedIds with:`, newSelectedIds);
    setSelectedIds(newSelectedIds);
  }, [disabled, setSelectedIds, selectedIds]);

  const selectedNames = React.useMemo(() => {
    return loras
      .filter(lora => selectedIds.includes(lora.id))
      .map(lora => lora.name);
  }, [loras, selectedIds]);

  const filteredLoras = React.useMemo(() => {
    if (!searchTerm) return loras;
    return loras.filter(lora => 
      lora.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [loras, searchTerm]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-auto min-h-[2.5rem]", triggerClassName)}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1">
            {selectedNames.length > 0 
              ? selectedNames.map(name => (
                  <Badge key={name} variant="secondary" className="whitespace-nowrap">
                    {name}
                  </Badge>
                ))
              : <span className="text-muted-foreground font-normal">{placeholder}</span>}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <div className="p-2">
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={disabled}
            className="w-full"
          />
        </div>
        <ScrollArea className="max-h-60">
          <div className="p-2 space-y-1">
            {filteredLoras.length > 0 ? (
              filteredLoras.map((lora) => {
                const isSelected = selectedIds.includes(lora.id);
                return (
                  <div 
                    key={lora.id} 
                    className={cn(
                      "flex items-center space-x-2 p-2 rounded-md hover:bg-accent hover:text-accent-foreground", 
                      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    )}
                    onClick={() => { 
                      if (!disabled) handleSelect(lora.id, !isSelected); 
                    }}
                  >
                    <Checkbox
                      id={`lora-${lora.id}`}
                      checked={isSelected}
                      disabled={disabled}
                      aria-labelledby={`lora-label-${lora.id}`}
                      tabIndex={-1}
                    />
                    <Label 
                      htmlFor={`lora-${lora.id}`} 
                      id={`lora-label-${lora.id}`}
                      className={cn("flex-1", disabled ? "cursor-not-allowed" : "cursor-pointer")}
                      onClick={(e) => {
                        if (!disabled) {
                          e.preventDefault(); 
                        }
                      }}
                    >
                      {lora.name}
                    </Label>
                  </div>
                );
              })
            ) : (
              <p className="p-2 text-sm text-muted-foreground text-center">{noResultsText}</p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
} 