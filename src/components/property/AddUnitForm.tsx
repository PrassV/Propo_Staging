import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { UnitCreate } from '@/api/types'; 
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from "@/components/ui/button";

interface AddUnitFormProps {
    onSubmit: (data: UnitCreate) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

// Define the form schema for validation
const formSchema = z.object({
    unit_number: z.string().min(1, 'Unit number is required'),
    status: z.enum(['Vacant', 'Under Maintenance']), // New units can't be Occupied
    bedrooms: z.number().nullable().optional(),
    bathrooms: z.number().nullable().optional(),
    area_sqft: z.number().nullable().optional(),
    rent: z.number().min(0, 'Rent must be a positive number').nullable().optional(),
    deposit: z.number().min(0, 'Deposit must be a positive number').nullable().optional(),
});

// Define the form values type
type FormValues = z.infer<typeof formSchema>;

export default function AddUnitForm({ onSubmit, onCancel, isLoading = false }: AddUnitFormProps) {
    // Initialize the form with react-hook-form
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            unit_number: '',
            status: 'Vacant',
            bedrooms: null,
            bathrooms: null,
            area_sqft: null,
            rent: null,
            deposit: null,
        },
    });

    // Handle form submission
    const handleSubmit = (values: FormValues) => {
        onSubmit(values);
    };

    return (
        <Form {...form}>
            <form id="add-unit-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {/* Unit Number */}
                <FormField
                    control={form.control}
                    name="unit_number"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Unit Number/Identifier *</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., 101, Unit A, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Status */}
                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Status *</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                disabled={isLoading}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Vacant">Vacant</SelectItem>
                                    <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Bedrooms */}
                <FormField
                    control={form.control}
                    name="bedrooms"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Bedrooms</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="Number of bedrooms"
                                    {...field}
                                    value={field.value === null ? '' : field.value}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        field.onChange(val === '' ? null : Number(val));
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Bathrooms */}
                <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Bathrooms</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="Number of bathrooms"
                                    {...field}
                                    value={field.value === null ? '' : field.value}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        field.onChange(val === '' ? null : Number(val));
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Area */}
                <FormField
                    control={form.control}
                    name="area_sqft"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Area (sq ft)</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="Area in square feet"
                                    {...field}
                                    value={field.value === null ? '' : field.value}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        field.onChange(val === '' ? null : Number(val));
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Rent */}
                <FormField
                    control={form.control}
                    name="rent"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Monthly Rent</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="Rent amount"
                                    {...field}
                                    value={field.value === null ? '' : field.value}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        field.onChange(val === '' ? null : Number(val));
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Deposit */}
                <FormField
                    control={form.control}
                    name="deposit"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Security Deposit</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="Deposit amount"
                                    {...field}
                                    value={field.value === null ? '' : field.value}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        field.onChange(val === '' ? null : Number(val));
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Add Submit and Cancel Buttons */} 
                <div className="flex justify-end space-x-2 pt-4">
                     <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                        Cancel
                     </Button>
                     <Button type="submit" form="add-unit-form" disabled={isLoading}>
                        {isLoading ? "Adding..." : "Add Unit"}
                     </Button>
                 </div>
            </form>
        </Form>
    );
} 