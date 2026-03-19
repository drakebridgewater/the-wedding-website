from django.contrib import admin
from django import forms
from .models import Guest, Party, WeddingPartyMember, WeddingPartyGroup


class GuestForm(forms.ModelForm):
    class Meta:
        model = Guest
        fields = '__all__'
        widgets = {
            'first_name': forms.TextInput(),
            'last_name': forms.TextInput(),
            'email': forms.TextInput(),
            'dietary_restrictions': forms.Textarea(attrs={'rows': 3}),
        }


class PartyForm(forms.ModelForm):
    class Meta:
        model = Party
        fields = '__all__'
        widgets = {
            'name': forms.TextInput(),
            'address': forms.Textarea(attrs={'rows': 3}),
            'comments': forms.Textarea(attrs={'rows': 3}),
        }


class GuestInline(admin.StackedInline):
    model = Guest
    form = GuestForm
    fields = ('first_name', 'last_name', 'email', 'is_attending', 'is_child', 'meal', 'dietary_restrictions')
    extra = 1


class PartyAdmin(admin.ModelAdmin):
    form = PartyForm
    list_display = ('name', 'type', 'category', 'side', 'status', 'save_the_date_sent', 'invitation_sent',
                    'rehearsal_dinner', 'invitation_opened', 'is_attending', 'rsvp_responded_at', 'plus_one_allowed')
    list_filter = ('type', 'category', 'side', 'status', 'is_attending', 'rehearsal_dinner',
                   'invitation_opened', 'plus_one_allowed')
    search_fields = ('name', 'address')
    inlines = [GuestInline]


class GuestAdmin(admin.ModelAdmin):
    form = GuestForm
    list_display = ('first_name', 'last_name', 'party', 'email', 'is_attending', 'is_child', 'meal', 'dietary_restrictions')
    list_filter = ('is_attending', 'is_child', 'meal', 'party__status', 'party__category', 'party__rehearsal_dinner')
    search_fields = ('first_name', 'last_name', 'email', 'dietary_restrictions')


@admin.register(WeddingPartyMember)
class WeddingPartyMemberAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'color', 'email', 'order')
    list_editable = ('order',)
    list_filter = ('role',)
    search_fields = ('name', 'email')
    ordering = ('order', 'name')


@admin.register(WeddingPartyGroup)
class WeddingPartyGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'member_count', 'color', 'order')
    list_editable = ('order',)
    filter_horizontal = ('members',)
    ordering = ('order', 'name')

    def member_count(self, obj):
        return obj.members.count()
    member_count.short_description = 'Members'


admin.site.register(Party, PartyAdmin)
admin.site.register(Guest, GuestAdmin)
