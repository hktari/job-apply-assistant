"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobRelevanceService = void 0;
var common_1 = require("@nestjs/common");
var openai_1 = require("openai");
var fs = require("fs/promises");
var path = require("path");
var JobRelevanceService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var JobRelevanceService = _classThis = /** @class */ (function () {
        function JobRelevanceService_1(configService) {
            this.configService = configService;
            this.openai = new openai_1.OpenAI({
                apiKey: this.configService.get('OPENAI_API_KEY'),
            });
            // Assuming profile.json is in the root of the project
            this.profilePath = path.join(process.cwd(), 'profile.json');
        }
        JobRelevanceService_1.prototype.getJobPreferences = function () {
            return __awaiter(this, void 0, void 0, function () {
                var data, profile, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, fs.readFile(this.profilePath, 'utf-8')];
                        case 1:
                            data = _a.sent();
                            profile = JSON.parse(data);
                            if (profile && profile.jobPreferences) {
                                return [2 /*return*/, profile.jobPreferences];
                            }
                            else {
                                throw new Error('Job preferences not found in profile.json');
                            }
                            return [3 /*break*/, 3];
                        case 2:
                            error_1 = _a.sent();
                            console.error('Error reading or parsing profile.json:', error_1);
                            throw error_1;
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Analyzes whether a job title is relevant based on the user's job preferences
         * stored in profile.json using OpenAI.
         * @param jobTitle The job title to analyze.
         * @returns A promise that resolves to an AIRelevanceResponse object.
         */
        JobRelevanceService_1.prototype.analyzeRelevance = function (jobTitle) {
            return __awaiter(this, void 0, void 0, function () {
                var jobPreferences, systemPrompt, userPrompt, completion, aiResponseContent, parsedResponse, error_2;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 3, , 4]);
                            return [4 /*yield*/, this.getJobPreferences()];
                        case 1:
                            jobPreferences = _c.sent();
                            systemPrompt = "You are an expert career advisor. Your task is to determine if a given job title is relevant to the user's job preferences.\nRespond with a JSON object containing a boolean field 'isRelevant' and a string field 'reasoning'. For example: {\"isRelevant\": true, \"reasoning\": \"The job title aligns with preferred roles.\"}";
                            userPrompt = "\nJob Title: \"".concat(jobTitle, "\"\n\nUser's Job Preferences:\n").concat(JSON.stringify(jobPreferences, null, 2), "\n\nIs this job title relevant based on these preferences? Provide your answer in the specified JSON format.\n");
                            return [4 /*yield*/, this.openai.chat.completions.create({
                                    model: "gpt-4",
                                    messages: [
                                        { role: "system", content: systemPrompt },
                                        { role: "user", content: userPrompt },
                                    ],
                                    response_format: { type: "json_object" },
                                })];
                        case 2:
                            completion = _c.sent();
                            aiResponseContent = (_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
                            if (!aiResponseContent) {
                                throw new Error('OpenAI response content is null or undefined.');
                            }
                            try {
                                parsedResponse = JSON.parse(aiResponseContent);
                                return [2 /*return*/, parsedResponse];
                            }
                            catch (parseError) {
                                console.error('Error parsing AI response:', parseError);
                                console.error('Raw AI response:', aiResponseContent);
                                // Fallback or attempt to infer relevance if parsing fails
                                return [2 /*return*/, {
                                        isRelevant: false,
                                        reasoning: 'Failed to parse AI response. Raw: ' + aiResponseContent
                                    }];
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            error_2 = _c.sent();
                            console.error('Error in analyzeJobTitleRelevance:', error_2);
                            throw error_2;
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        return JobRelevanceService_1;
    }());
    __setFunctionName(_classThis, "JobRelevanceService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        JobRelevanceService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return JobRelevanceService = _classThis;
}();
exports.JobRelevanceService = JobRelevanceService;
