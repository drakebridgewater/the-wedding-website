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
        }


class GuestInline(admin.TabularInline):
    model = Guest
    form = GuestForm
    fields = ('first_name', 'last_name', 'email', 'is_attending', 'meal', 'is_child')
    extra = 1


class PartyAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'category', 'save_the_date_sent', 'invitation_sent', 'rehearsal_dinner', 'invitation_opened',
                    'is_invited', 'is_attending')
    list_filter = ('type', 'category', 'is_invited', 'is_attending', 'rehearsal_dinner', 'invitation_opened')
    inlines = [GuestInline]


class GuestAdmin(admin.ModelAdmin):
    form = GuestForm
    list_display = ('first_name', 'last_name', 'party', 'email', 'is_attending', 'is_child', 'meal')
    list_filter = ('is_attending', 'is_child', 'meal', 'party__is_invited', 'party__category', 'party__rehearsal_dinner')


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
