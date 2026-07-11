from django.contrib import admin
from django import forms
from django.db.models import Exists, OuterRef
from .models import Guest, MealOption, Party, WeddingPartyMember, WeddingPartyGroup


class _HasEmailSubquery:
    """Reusable Exists subquery: party has at least one guest with a real email."""
    @staticmethod
    def qs():
        return Guest.objects.filter(party=OuterRef('pk'), email__isnull=False).exclude(email='')


class SaveTheDateStatusFilter(admin.SimpleListFilter):
    title = 'save-the-date status'
    parameter_name = 'std_status'

    def lookups(self, request, model_admin):
        return [
            ('sent', 'Sent'),
            ('pending', 'Not sent — has email'),
            ('postal', 'No email — postal only'),
        ]

    def queryset(self, request, queryset):
        has_email = _HasEmailSubquery.qs()
        if self.value() == 'sent':
            return queryset.filter(save_the_date_sent__isnull=False)
        if self.value() == 'pending':
            return queryset.filter(save_the_date_sent__isnull=True, status='invited').filter(Exists(has_email))
        if self.value() == 'postal':
            return queryset.filter(~Exists(has_email))
        return queryset


class InvitationStatusFilter(admin.SimpleListFilter):
    title = 'invitation status'
    parameter_name = 'inv_status'

    def lookups(self, request, model_admin):
        return [
            ('sent', 'Sent'),
            ('pending', 'Not sent — has email'),
            ('postal', 'No email — postal only'),
        ]

    def queryset(self, request, queryset):
        has_email = _HasEmailSubquery.qs()
        if self.value() == 'sent':
            return queryset.filter(invitation_sent__isnull=False)
        if self.value() == 'pending':
            return queryset.filter(invitation_sent__isnull=True, status='invited').filter(Exists(has_email))
        if self.value() == 'postal':
            return queryset.filter(~Exists(has_email))
        return queryset


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

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        options = [('', '---------')] + MealOption.choices()
        current = self.instance.meal if self.instance.pk else None
        if current and current not in dict(options):
            options.append((current, current))
        self.fields['meal'] = forms.ChoiceField(choices=options, required=False)


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
    list_display = ('name', 'type', 'category', 'side', 'status', 'has_email',
                    'save_the_date_sent', 'invitation_sent',
                    'rehearsal_dinner', 'invitation_opened', 'is_attending', 'rsvp_responded_at', 'plus_one_allowed')
    list_filter = ('type', 'category', 'side', 'status', 'is_attending', 'rehearsal_dinner',
                   'invitation_opened', 'plus_one_allowed', SaveTheDateStatusFilter, InvitationStatusFilter)
    search_fields = ('name', 'address')
    inlines = [GuestInline]

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('guest_set')

    @admin.display(boolean=True, description='Has Email')
    def has_email(self, obj):
        return bool(obj.guest_emails)


class GuestAdmin(admin.ModelAdmin):
    form = GuestForm
    list_display = ('first_name', 'last_name', 'party', 'email', 'is_attending', 'is_child', 'meal', 'dietary_restrictions')
    list_filter = ('is_attending', 'is_child', 'meal', 'party__status', 'party__category', 'party__rehearsal_dinner')
    search_fields = ('first_name', 'last_name', 'email', 'dietary_restrictions')


@admin.register(MealOption)
class MealOptionAdmin(admin.ModelAdmin):
    list_display = ('label', 'key', 'ordering', 'is_active')
    list_editable = ('ordering', 'is_active')
    prepopulated_fields = {'key': ('label',)}
    ordering = ('ordering', 'label')


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
